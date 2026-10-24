from datetime import datetime, timezone
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.services.elexon_client import ElexonUpstreamError

client = TestClient(app)
UTC = timezone.utc


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "windiq-api"


def test_analysis_endpoint_valid_flow():
    # Mock elexon_client methods
    mock_actuals = [
        {
            "dataset": "FUELHH",
            "startTime": "2026-01-16T00:00:00Z",
            "publishTime": "2026-01-16T00:30:00Z",
            "settlementDate": "2026-01-16",
            "settlementPeriod": 1,
            "fuelType": "WIND",
            "generation": 8000
        }
    ]
    mock_forecasts = [
        {
            "dataset": "WINDFOR",
            "startTime": "2026-01-16T00:00:00Z",
            "publishTime": "2026-01-15T09:30:00Z",
            "generation": 8500
        }
    ]
    retrieval_dt = datetime(2026, 1, 15, 10, 0, tzinfo=UTC)

    with patch("app.services.analysis_service.elexon_client.fetch_fuelhh_actuals", new=AsyncMock(return_value=(mock_actuals, retrieval_dt))), \
         patch("app.services.analysis_service.elexon_client.fetch_windfor_vintages", new=AsyncMock(return_value=(mock_forecasts, retrieval_dt))):
        
        response = client.get("/api/analysis?decision_date=2026-01-15&cutoff=09:50&timezone=Europe/London")
        assert response.status_code == 200
        data = response.json()

        # Metadata
        assert data["metadata"]["decisionDate"] == "2026-01-15"
        assert data["metadata"]["deliveryDate"] == "2026-01-16"
        assert data["metadata"]["cutoffTime"] == "09:50"
        assert data["metadata"]["source"] == "Elexon BMRS"

        # Coverage
        assert data["coverage"]["expectedPeriods"] == 48
        assert data["coverage"]["matchedPeriods"] == 1

        # Metrics
        assert data["metrics"]["maeMw"] == 500.0
        assert data["metrics"]["biasMw"] == 500.0  # 8500 - 8000
        assert data["metrics"]["maxAbsoluteErrorMw"] == 500.0

        # Points
        points = data["points"]
        assert len(points) == 48
        matched_pt = points[0]
        assert matched_pt["status"] == "matched"
        assert matched_pt["forecastGenerationMw"] == 8500.0
        assert matched_pt["actualGenerationMw"] == 8000.0
        assert matched_pt["signedErrorMw"] == 500.0


def test_analysis_endpoint_invalid_date():
    response = client.get("/api/analysis?decision_date=2026-02-05&cutoff=09:50&timezone=Europe/London")
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert "January 2026" in data["error"]["message"]


def test_analysis_endpoint_invalid_cutoff():
    response = client.get("/api/analysis?decision_date=2026-01-15&cutoff=25:99&timezone=Europe/London")
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert "cutoff" in data["error"]["message"].lower()


def test_analysis_endpoint_invalid_timezone():
    response = client.get("/api/analysis?decision_date=2026-01-15&cutoff=09:50&timezone=America/New_York")
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert "timezone" in data["error"]["message"].lower()


def test_analysis_endpoint_upstream_error_handling():
    with patch("app.services.analysis_service.elexon_client.fetch_fuelhh_actuals", new=AsyncMock(side_effect=ElexonUpstreamError("Elexon timeout", 503, "ELEXON_TIMEOUT"))):
        response = client.get("/api/analysis?decision_date=2026-01-15&cutoff=09:50&timezone=Europe/London")
        assert response.status_code == 503
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "ELEXON_TIMEOUT"
