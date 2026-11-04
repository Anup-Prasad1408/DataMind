from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app
import app.routes.transform as transform_routes

client = TestClient(app)


def demo_settings():
    return SimpleNamespace(max_text_chars=40000, max_upload_mb=8, ai_enabled=False)


def test_health_endpoint_reports_service():
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json()['service'] == 'DataMind API'


def test_text_transform_endpoint_uses_explicit_demo_mode(monkeypatch):
    monkeypatch.setattr(transform_routes, 'get_settings', demo_settings)
    response = client.post('/api/transform', json={
        'text': 'Planning comes first. Then development begins.',
        'format': 'structured_notes',
        'language': 'English',
    })
    assert response.status_code == 200
    payload = response.json()
    assert payload['mode'] == 'demo'
    assert payload['format'] == 'structured_notes'
    assert 'Planning' in payload['content']


def test_file_upload_extracts_plain_text(monkeypatch):
    monkeypatch.setattr(transform_routes, 'get_settings', demo_settings)
    response = client.post(
        '/api/transform/file',
        data={'format': 'summary', 'detail': 'short'},
        files={'file': ('notes.txt', b'Raw data becomes useful knowledge.', 'text/plain')},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload['source_filename'] == 'notes.txt'
    assert payload['mode'] == 'demo'


def test_file_upload_rejects_unsupported_extension(monkeypatch):
    monkeypatch.setattr(transform_routes, 'get_settings', demo_settings)
    response = client.post(
        '/api/transform/file',
        data={'format': 'summary'},
        files={'file': ('notes.exe', b'not allowed', 'application/octet-stream')},
    )
    assert response.status_code == 400
