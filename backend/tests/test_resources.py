"""
Tests backend resource read/creation.
"""


def test_create_resource_success(auth_client, valid_resource_payload):
    """
    Ensure the resource is created correctly.
    """
    response = auth_client.post("/resources/", json=valid_resource_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Tagesschau"
    assert data["resource_type"] == "newspaper"
    assert data["category"] == "news"


def test_get_resources_list(auth_client, valid_resource_payload):
    """
    Ensure resources are retrieved as a list.
    """
    auth_client.post("/resources/", json=valid_resource_payload)
    response = auth_client.get("/resources/")
    assert response.status_code == 200
    resources = response.json()
    assert isinstance(resources, list)
    assert any(r["name"] == "Tagesschau" for r in resources)


def test_search_resources_success(auth_client, valid_resource_payload):
    """
    Ensure the search filter correctly works based on name and description.
    """
    auth_client.post("/resources/", json=valid_resource_payload)

    response = auth_client.get("/resources/?search=Tagesschau")
    assert response.status_code == 200
    assert len(response.json()) >= 1
    assert response.json()[0]["name"] == "Tagesschau"

    response = auth_client.get("/resources/?search=German news")
    assert response.status_code == 200
    assert len(response.json()) >= 1

    response = auth_client.get("/resources/?search=NonExistentResource")
    assert response.status_code == 200
    assert len(response.json()) == 0


def test_update_resource_success(auth_client, valid_resource_payload):
    """
    Ensure the resource is correctly updated.
    """
    response = auth_client.post("/resources/", json=valid_resource_payload)
    resource_id = response.json()["id"]

    response = auth_client.put(
        f"/resources/{resource_id}", json={"description": "Updated description"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Updated description"
    assert data["name"] == "Tagesschau"


def test_update_resource_not_found(auth_client):
    """
    Ensure the status code 404 is returned.
    """
    response = auth_client.put("/resources/9999", json={})
    assert response.status_code == 404


def test_delete_resource_success(auth_client, valid_resource_payload):
    """
    Ensure the resource is correctly deleted.
    """
    response = auth_client.post("/resources/", json=valid_resource_payload)
    resource_id = response.json()["id"]

    response = auth_client.delete(f"/resources/{resource_id}")
    assert response.status_code == 204

    response = auth_client.get("/resources/")
    resources = response.json()
    assert not any(r["id"] == resource_id for r in resources)


def test_delete_resource_not_found(auth_client):
    """
    Ensure the status code 404 is returned.
    """
    response = auth_client.delete("/resources/9999")
    assert response.status_code == 404


def test_create_resource_duplicate_url_returns_409(auth_client, valid_resource_payload):
    """
    Ensure a second POST with the same URL returns HTTP 409.
    """
    auth_client.post("/resources/", json=valid_resource_payload)
    response = auth_client.post("/resources/", json=valid_resource_payload)
    assert response.status_code == 409
    assert response.json()["detail"] == "A resource with this URL already exists."


def test_update_resource_duplicate_url_returns_409(
    auth_client, valid_resource_payload, second_resource_payload
):
    """
    Ensure updating a resource's URL to collide with another resource returns HTTP 409.
    """
    auth_client.post("/resources/", json=valid_resource_payload)
    response = auth_client.post("/resources/", json=second_resource_payload)
    second_id = response.json()["id"]

    response = auth_client.put(
        f"/resources/{second_id}", json={"url": valid_resource_payload["url"]}
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "A resource with this URL already exists."
