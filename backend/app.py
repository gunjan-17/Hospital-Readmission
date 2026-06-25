"""
🏥 Hospital Readmission Prediction — Flask Backend API
=======================================================
Run this file to start the backend server:
    cd backend
    python app.py

Server starts at: http://localhost:5000
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from predict import (
    predict_readmission,
    predict_stay,
    get_clusters,
    get_rules,
    get_dashboard_stats
)

app = Flask(__name__)
CORS(app)  # Allow React frontend (localhost:3000) to call this API


# ─────────────────────────────────────────────
# 🔵 Health Check
# ─────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    """Quick check that the server is running."""
    return jsonify({'status': 'ok', 'message': 'Hospital Readmission API is running ✅'})


# ─────────────────────────────────────────────
# 🔴 POST /api/predict-readmission
# ─────────────────────────────────────────────
@app.route('/api/predict-readmission', methods=['POST'])
def api_predict_readmission():
    """
    Predict whether a patient will be readmitted within 30 days.

    Request body (JSON):
    {
        "age": 65,
        "time_in_hospital": 5,
        "num_medications": 14,
        "num_lab_procedures": 40,
        "num_procedures": 1,
        "number_diagnoses": 7,
        "number_inpatient": 2,
        "number_outpatient": 0,
        "number_emergency": 1
    }

    Response:
    {
        "risk_label": "High",
        "risk_color": "red",
        "probability": 0.84,
        "probability_pct": 84,
        "top_reasons": ["High medication count", "Prior inpatient visits", "..."],
        "cluster": 0,
        "cluster_name": "High-Risk Chronic Patients"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data received'}), 400

        result = predict_readmission(data)
        return jsonify(result), 200

    except ValueError as e:
        return jsonify({'error': f'Invalid input: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500


# ─────────────────────────────────────────────
# 🔴 POST /api/predict-stay
# ─────────────────────────────────────────────
@app.route('/api/predict-stay', methods=['POST'])
def api_predict_stay():
    """
    Predict how many days a patient will stay in hospital.

    Request body (JSON): same fields as predict-readmission

    Response:
    {
        "predicted_days": 6,
        "predicted_days_range": "5 - 7 days",
        "confidence": "±1.8 days"
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data received'}), 400

        result = predict_stay(data)
        return jsonify(result), 200

    except ValueError as e:
        return jsonify({'error': f'Invalid input: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500


# ─────────────────────────────────────────────
# 🟢 GET /api/clusters
# ─────────────────────────────────────────────
@app.route('/api/clusters', methods=['GET'])
def api_clusters():
    """
    Return all patient cluster profiles.

    Response:
    {
        "clusters": [
            {
                "cluster_id": 0,
                "cluster_name": "High-Risk Chronic Patients",
                "patient_count": 8432,
                "readmission_rate": 38.2,
                "avg_age": 67.1,
                "avg_medications": 14.2,
                "avg_diagnoses": 8.1,
                "avg_stay_days": 6.5,
                "avg_inpatient": 1.8,
                "avg_lab_tests": 52.3
            }, ...
        ]
    }
    """
    try:
        result = get_clusters()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': f'Failed to load clusters: {str(e)}'}), 500


# ─────────────────────────────────────────────
# 🟢 GET /api/rules
# ─────────────────────────────────────────────
@app.route('/api/rules', methods=['GET'])
def api_rules():
    """
    Return association rules filtered by query parameters.

    Query params (all optional):
        min_confidence  float  default: 0.09
        min_lift        float  default: 1.03
        min_support     float  default: 0.08
        limit           int    default: 50

    Example: GET /api/rules?min_confidence=0.7&min_lift=1.5&limit=20

    Response:
    {
        "total_rules": 42,
        "rules": [
            {
                "antecedents": "insulin + prior_inpatient_visits",
                "consequents": "readmitted_30d",
                "support": 0.12,
                "support_pct": 12.0,
                "confidence": 0.79,
                "confidence_pct": 79.0,
                "lift": 2.1,
                "plain_english": "IF patient uses insulin AND has prior visits THEN likely readmitted"
            }, ...
        ]
    }
    """
    try:
        min_confidence = float(request.args.get('min_confidence', 0.09))
        min_lift       = float(request.args.get('min_lift',       1.03))
        min_support    = float(request.args.get('min_support',    0.08))
        limit          = int(request.args.get('limit',            50))
        print(f"DEBUG rules called: conf={min_confidence}, lift={min_lift}, sup={min_support}") 

        result = get_rules(min_confidence, min_lift, min_support, limit)
        return jsonify(result), 200

    except ValueError as e:
        return jsonify({'error': f'Invalid filter parameters: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to load rules: {str(e)}'}), 500


# ─────────────────────────────────────────────
# 🟢 GET /api/dashboard-stats
# ─────────────────────────────────────────────
@app.route('/api/dashboard-stats', methods=['GET'])
def api_dashboard_stats():
    """
    Return summary statistics for the main dashboard.

    Response:
    {
        "kpis": {
            "total_patients": 71518,
            "readmission_rate_pct": 11.2,
            "avg_stay_days": 4.4,
            "high_risk_patients_pct": 24.5
        },
        "readmission_by_age": [
            {"age_group": "[0-10)", "rate": 5.1}, ...
        ],
        "cluster_distribution": [
            {"cluster_name": "High-Risk Chronic Patients",
             "count": 8432, "pct": 23.4}, ...
        ],
        "top_diagnoses": [
            {"diagnosis": "Circulatory", "count": 4200}, ...
        ],
        "stay_distribution": [
            {"days": 1, "count": 3200}, ...
        ]
    }
    """
    try:
        result = get_dashboard_stats()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': f'Failed to load dashboard stats: {str(e)}'}), 500


# ─────────────────────────────────────────────
# 🚀 Run Server
# ─────────────────────────────────────────────
if __name__ == '__main__':
    print('\n' + '='*50)
    print('🏥 Hospital Readmission API Starting...')
    print('='*50)
    print('  URL:  http://localhost:5000')
    print('  Endpoints:')
    print('    GET  /api/health')
    print('    GET  /api/dashboard-stats')
    print('    GET  /api/clusters')
    print('    GET  /api/rules')
    print('    POST /api/predict-readmission')
    print('    POST /api/predict-stay')
    print('='*50 + '\n')
    app.run(debug=True, host='0.0.0.0', port=5000)