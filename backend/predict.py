"""
🏥 Hospital Readmission Prediction — Model Inference
=====================================================
This file loads all trained models and provides
prediction functions used by app.py (Flask routes).
"""

import os
import joblib
import numpy as np
import pandas as pd

# ─────────────────────────────────────────────
# 📁 Paths
# ─────────────────────────────────────────────
MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')
DATA_DIR   = os.path.join(os.path.dirname(__file__), '..', 'data')


def _model_path(filename):
    return os.path.join(MODELS_DIR, filename)

def _data_path(filename):
    return os.path.join(DATA_DIR, filename)


# ─────────────────────────────────────────────
# 📦 Load All Models at Startup (cached)
# ─────────────────────────────────────────────
print('📦 Loading models...')

try:
    clf_model        = joblib.load(_model_path('classification_model.pkl'))
    clf_scaler       = joblib.load(_model_path('scaler.pkl'))
    feature_columns  = joblib.load(_model_path('feature_columns.pkl'))
    top_features     = joblib.load(_model_path('top_features.pkl'))
    print('  ✅ Classification model loaded')
except Exception as e:
    print(f'  ⚠️  Classification model not found: {e}')
    clf_model = clf_scaler = feature_columns = top_features = None

try:
    reg_model        = joblib.load(_model_path('regression_model.pkl'))
    reg_scaler       = joblib.load(_model_path('regression_scaler.pkl'))
    reg_feat_cols    = joblib.load(_model_path('regression_feature_columns.pkl'))
    print('  ✅ Regression model loaded')
except Exception as e:
    print(f'  ⚠️  Regression model not found: {e}')
    reg_model = reg_scaler = reg_feat_cols = None

try:
    cluster_model    = joblib.load(_model_path('cluster_model.pkl'))
    cluster_scaler   = joblib.load(_model_path('cluster_scaler.pkl'))
    cluster_features = joblib.load(_model_path('clustering_features.pkl'))
    cluster_profiles = pd.read_csv(_model_path('cluster_profiles.csv'))
    print('  ✅ Clustering model loaded')
except Exception as e:
    print(f'  ⚠️  Clustering model not found: {e}')
    cluster_model = cluster_scaler = cluster_features = cluster_profiles = None

try:
    rules_df = pd.read_csv(_data_path('readmission_rules.csv'))
    print('  ✅ Association rules loaded')
except Exception as e:
    print(f'  ⚠️  Rules not found: {e}')
    rules_df = None

try:
    clustered_data = pd.read_csv(_data_path('clustered_data.csv'))
    print('  ✅ Dataset loaded for dashboard stats')
except Exception as e:
    print(f'  ⚠️  Dataset not found: {e}')
    clustered_data = None

print('📦 Model loading complete!\n')


# ─────────────────────────────────────────────
# 🔧 Helper — Build Feature Vector from Input
# ─────────────────────────────────────────────
def _build_input_df(data: dict, columns: list) -> pd.DataFrame:
    """
    Build a single-row DataFrame aligned to model's expected columns.
    Missing fields default to 0.
    """
    row = {col: data.get(col, 0) for col in columns}
    return pd.DataFrame([row])[columns]


# ─────────────────────────────────────────────
# 🩺 predict_readmission()
# ─────────────────────────────────────────────
def predict_readmission(data: dict) -> dict:
    """
    Predict readmission risk from patient data.
    Returns risk label, probability, top reasons, and cluster assignment.
    """
    if clf_model is None:
        raise RuntimeError('Classification model not loaded. Run Notebook 2 first.')

    # Build input aligned to training feature columns
    X_input = _build_input_df(data, feature_columns)

    # Scale if model expects it (Linear models)
    # Tree-based models (RF, XGBoost) don't need scaling but scaler won't hurt
    try:
        X_scaled = clf_scaler.transform(X_input)
        proba = clf_model.predict_proba(X_scaled)[0][1]
    except Exception:
        proba = clf_model.predict_proba(X_input)[0][1]

    # Risk label
    if proba >= 0.70:
        risk_label = 'High'
        risk_color = 'red'
    elif proba >= 0.40:
        risk_label = 'Moderate'
        risk_color = 'orange'
    else:
        risk_label = 'Low'
        risk_color = 'green'

    # Top contributing reasons (feature importance × input value)
    top_reasons = _get_top_reasons(X_input, top_features)

    # Assign patient to a cluster
    cluster_id, cluster_name = _assign_cluster(data)

    return {
        'risk_label':       risk_label,
        'risk_color':       risk_color,
        'probability':      round(float(proba), 4),
        'probability_pct':  round(float(proba) * 100, 1),
        'top_reasons':      top_reasons,
        'cluster_id':       cluster_id,
        'cluster_name':     cluster_name
    }


# ─────────────────────────────────────────────
# 🏥 predict_stay()
# ─────────────────────────────────────────────
def predict_stay(data: dict) -> dict:
    """
    Predict expected length of hospital stay (days).
    """
    if reg_model is None:
        raise RuntimeError('Regression model not loaded. Run Notebook 5 first.')

    X_input = _build_input_df(data, reg_feat_cols)

    # Use scaled data for linear models
    try:
        X_scaled = reg_scaler.transform(X_input)
        predicted = reg_model.predict(X_scaled)[0]
    except Exception:
        predicted = reg_model.predict(X_input)[0]

    # Clip to realistic range
    predicted = float(np.clip(predicted, 1, 14))
    predicted_rounded = round(predicted)

    # Simple confidence range ±1.8 days (from Notebook 5 MAE)
    margin = 1.8
    low  = max(1,  round(predicted - margin))
    high = min(14, round(predicted + margin))

    return {
        'predicted_days':       predicted_rounded,
        'predicted_days_exact': round(predicted, 2),
        'predicted_days_range': f'{low} – {high} days',
        'confidence':           f'± {margin} days'
    }


# ─────────────────────────────────────────────
# 👥 get_clusters()
# ─────────────────────────────────────────────
def get_clusters() -> dict:
    """
    Return all cluster profiles as a list of dicts.
    """
    if cluster_profiles is None:
        raise RuntimeError('Cluster profiles not found. Run Notebook 3 first.')

    clusters = []
    for _, row in cluster_profiles.iterrows():
        cluster = {
            'cluster_id':       int(row.get('cluster', 0)),
            'cluster_name':     str(row.get('cluster_name', f'Cluster {int(row.get("cluster", 0))}')),
            'patient_count':    int(row.get('patient_count', 0)),
            'readmission_rate': float(row.get('readmission_rate', 0)),
            'avg_age':          round(float(row.get('avg_age', 0)), 1),
            'avg_medications':  round(float(row.get('avg_medications', 0)), 1),
            'avg_diagnoses':    round(float(row.get('avg_diagnoses', 0)), 1),
            'avg_stay_days':    round(float(row.get('avg_stay_days', 0)), 1),
            'avg_inpatient':    round(float(row.get('avg_inpatient', 0)), 1),
            'avg_lab_tests':    round(float(row.get('avg_lab_tests', 0)), 1),
        }
        clusters.append(cluster)

    # Sort by readmission rate descending
    clusters.sort(key=lambda x: x['readmission_rate'], reverse=True)
    return {'clusters': clusters}


# ─────────────────────────────────────────────
# 🔗 get_rules()
# ─────────────────────────────────────────────
def get_rules(min_confidence=0.09, min_lift=1.03,
              min_support=0.08, limit=50) -> dict:
    """
    Return filtered association rules.
    """
    if rules_df is None:
        raise RuntimeError('Rules not found. Run Notebook 4 first.')

    filtered = rules_df[
        (rules_df['confidence'] >= min_confidence) &
        (rules_df['lift']       >= min_lift)       &
        (rules_df['support']    >= min_support)
    ].sort_values('lift', ascending=False).head(limit)

    rules_list = []
    for _, row in filtered.iterrows():
        ant = str(row['antecedents'])
        con = str(row['consequents'])
        rule = {
            'antecedents':    ant,
            'consequents':    con,
            'support':        round(float(row['support']),    4),
            'support_pct':    round(float(row['support']) * 100, 1),
            'confidence':     round(float(row['confidence']), 4),
            'confidence_pct': round(float(row['confidence']) * 100, 1),
            'lift':           round(float(row['lift']),       3),
            'plain_english':  f'IF patient has [{ant}] THEN likely [{con}]'
        }
        if 'leverage' in row:
            rule['leverage'] = round(float(row['leverage']), 5)
        rules_list.append(rule)

    return {
        'total_rules':      len(rules_list),
        'filters_applied': {
            'min_confidence': min_confidence,
            'min_lift':       min_lift,
            'min_support':    min_support
        },
        'rules': rules_list
    }


# ─────────────────────────────────────────────
# 📊 get_dashboard_stats()
# ─────────────────────────────────────────────
def get_dashboard_stats() -> dict:
    """
    Compute and return all KPIs and chart data for the dashboard.
    """
    if clustered_data is None:
        raise RuntimeError('Dataset not found. Check data/clustered_data.csv')

    df = clustered_data.copy()

    # ── KPIs ──
    total_patients      = len(df)
    readmission_rate    = round(df['readmitted_30'].mean() * 100, 1)
    avg_stay            = round(df['time_in_hospital'].mean(), 1)

    # High risk = patients with multiple risk factors
    high_risk_mask = (
        (df['number_inpatient']  >= 2) |
        (df['num_medications']   >= df['num_medications'].quantile(0.75)) |
        (df['number_diagnoses']  >= 7)
    )
    high_risk_pct = round(high_risk_mask.mean() * 100, 1)

    kpis = {
        'total_patients':        total_patients,
        'readmission_rate_pct':  readmission_rate,
        'avg_stay_days':         avg_stay,
        'high_risk_patients_pct': high_risk_pct
    }

    # ── Stay Duration Distribution ──
    stay_dist = df['time_in_hospital'].value_counts().sort_index()
    stay_distribution = [
        {'days': int(d), 'count': int(c)}
        for d, c in stay_dist.items()
    ]

    # ── Cluster Distribution ──
    cluster_dist = []
    if 'cluster' in df.columns and cluster_profiles is not None:
        for _, row in cluster_profiles.iterrows():
            cid = int(row.get('cluster', 0))
            count = int(row.get('patient_count', 0))
            cluster_dist.append({
                'cluster_id':   cid,
                'cluster_name': str(row.get('cluster_name', f'Cluster {cid}')),
                'count':        count,
                'pct':          round(count / total_patients * 100, 1)
            })

    # ── Readmission Rate by Medications Bucket ──
    df['med_bucket'] = pd.cut(
        df['num_medications'],
        bins=[0, 5, 10, 15, 20, 100],
        labels=['1-5', '6-10', '11-15', '16-20', '20+']
    )
    readmit_by_meds = df.groupby('med_bucket', observed=True)['readmitted_30'].mean() * 100
    readmission_by_medications = [
        {'medication_range': str(bucket), 'rate': round(float(rate), 1)}
        for bucket, rate in readmit_by_meds.items()
    ]

    # ── Readmission Rate by Number of Diagnoses ──
    diag_group = df.groupby('number_diagnoses')['readmitted_30'].mean() * 100
    diag_group = diag_group[diag_group.index <= 9]
    readmission_by_diagnoses = [
        {'num_diagnoses': int(d), 'rate': round(float(r), 1)}
        for d, r in diag_group.items()
    ]

    # ── Prior Inpatient Visits vs Readmission ──
    inpatient_group = df.groupby('number_inpatient')['readmitted_30'].mean() * 100
    inpatient_group = inpatient_group[inpatient_group.index <= 8]
    readmission_by_inpatient = [
        {'prior_visits': int(v), 'rate': round(float(r), 1)}
        for v, r in inpatient_group.items()
    ]

    return {
        'kpis':                       kpis,
        'stay_distribution':          stay_distribution,
        'cluster_distribution':       cluster_dist,
        'readmission_by_medications': readmission_by_medications,
        'readmission_by_diagnoses':   readmission_by_diagnoses,
        'readmission_by_inpatient':   readmission_by_inpatient
    }


# ─────────────────────────────────────────────
# 🔧 Private Helpers
# ─────────────────────────────────────────────
def _get_top_reasons(X_input: pd.DataFrame, top_feats: list) -> list:
    """
    Return top 3 human-readable reasons driving the prediction.
    Based on which high-importance features have elevated values.
    """
    # Friendly display names for features
    feature_labels = {
        'number_inpatient':    'Multiple prior inpatient visits',
        'num_medications':     'High number of medications',
        'number_diagnoses':    'Multiple diagnoses',
        'number_emergency':    'Prior emergency visits',
        'time_in_hospital':    'Long hospital stay history',
        'num_lab_procedures':  'High number of lab procedures',
        'number_outpatient':   'Multiple outpatient visits',
        'num_procedures':      'Multiple procedures performed',
        'age':                 'Advanced age group',
        'insulin':             'Insulin dependent',
        'metformin':           'On metformin',
    }

    reasons = []
    top_feats_limited = top_feats[:10] if top_feats else list(X_input.columns)[:10]

    for feat in top_feats_limited:
        if feat not in X_input.columns:
            continue
        val = X_input[feat].values[0]
        if val > 0:
            label = feature_labels.get(feat, feat.replace('_', ' ').title())
            reasons.append(label)
        if len(reasons) >= 3:
            break

    if not reasons:
        reasons = ['Insufficient data for detailed explanation']

    return reasons


def _assign_cluster(data: dict) -> tuple:
    """
    Assign the patient to a cluster using the KMeans model.
    Returns (cluster_id, cluster_name).
    """
    if cluster_model is None or cluster_features is None:
        return (0, 'Unknown')

    try:
        X_clust = pd.DataFrame([{
            col: data.get(col, 0) for col in cluster_features
        }])[cluster_features]

        X_scaled = cluster_scaler.transform(X_clust)
        cluster_id = int(cluster_model.predict(X_scaled)[0])

        # Look up cluster name from profiles
        cluster_name = f'Cluster {cluster_id}'
        if cluster_profiles is not None and 'cluster_name' in cluster_profiles.columns:
            match = cluster_profiles[cluster_profiles['cluster'] == cluster_id]
            if not match.empty:
                cluster_name = str(match.iloc[0]['cluster_name'])

        return (cluster_id, cluster_name)
    except Exception:
        return (0, 'Unknown')