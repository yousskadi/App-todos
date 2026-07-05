TASKS = "/api/v1/tasks"


async def _create(client, **overrides):
    payload = {"title": "Réviser le CKA", **overrides}
    response = await client.post(TASKS, json=payload)
    assert response.status_code == 201
    return response.json()


async def test_tasks_require_authentication(client):
    response = await client.get(TASKS)
    assert response.status_code == 401


async def test_create_task_with_defaults(auth_client):
    task = await _create(auth_client)
    assert task["priority"] == "normal"
    assert task["status"] == "todo"
    assert task["tags"] == []


async def test_create_task_full(auth_client):
    task = await _create(
        auth_client,
        description="Chapitres réseau et stockage",
        priority="urgent",
        category="Formation",
        tags=["kubernetes", "certif"],
        color="#ff5733",
        due_date="2026-08-01T18:00:00Z",
    )
    assert task["priority"] == "urgent"
    assert task["tags"] == ["kubernetes", "certif"]


async def test_create_task_rejects_empty_title(auth_client):
    response = await auth_client.post(TASKS, json={"title": ""})
    assert response.status_code == 422


async def test_create_task_rejects_bad_color(auth_client):
    response = await auth_client.post(TASKS, json={"title": "x", "color": "rouge"})
    assert response.status_code == 422


async def test_list_and_get_task(auth_client):
    task = await _create(auth_client)
    listing = (await auth_client.get(TASKS)).json()
    assert listing["total"] == 1
    assert listing["items"][0]["id"] == task["id"]

    detail = await auth_client.get(f"{TASKS}/{task['id']}")
    assert detail.status_code == 200


async def test_patch_updates_only_given_fields(auth_client):
    task = await _create(auth_client, description="garder")
    response = await auth_client.patch(f"{TASKS}/{task['id']}", json={"title": "Nouveau titre"})
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Nouveau titre"
    assert body["description"] == "garder"


async def test_patch_to_done_sets_completed_at(auth_client):
    task = await _create(auth_client)
    response = await auth_client.patch(f"{TASKS}/{task['id']}", json={"status": "done"})
    assert response.json()["completed_at"] is not None


async def test_complete_endpoint(auth_client):
    task = await _create(auth_client)
    response = await auth_client.post(f"{TASKS}/{task['id']}/complete")
    body = response.json()
    assert body["status"] == "done"
    assert body["completed_at"] is not None


async def test_archived_tasks_hidden_by_default(auth_client):
    task = await _create(auth_client)
    await auth_client.post(f"{TASKS}/{task['id']}/archive")

    assert (await auth_client.get(TASKS)).json()["total"] == 0
    archived = (await auth_client.get(TASKS, params={"status": "archived"})).json()
    assert archived["total"] == 1


async def test_delete_task(auth_client):
    task = await _create(auth_client)
    response = await auth_client.delete(f"{TASKS}/{task['id']}")
    assert response.status_code == 204
    assert (await auth_client.get(f"{TASKS}/{task['id']}")).status_code == 404


async def test_filters(auth_client):
    await _create(auth_client, title="Courses", category="Personnel", priority="low")
    await _create(auth_client, title="Réviser réseau", category="Formation", priority="urgent")

    by_category = (await auth_client.get(TASKS, params={"category": "Formation"})).json()
    assert by_category["total"] == 1
    assert by_category["items"][0]["title"] == "Réviser réseau"

    by_priority = (await auth_client.get(TASKS, params={"priority": "low"})).json()
    assert by_priority["total"] == 1

    by_text = (await auth_client.get(TASKS, params={"q": "réseau"})).json()
    assert by_text["total"] == 1


async def test_pagination(auth_client):
    for i in range(3):
        await _create(auth_client, title=f"Tâche {i}")
    page = (await auth_client.get(TASKS, params={"limit": 2, "offset": 2})).json()
    assert page["total"] == 3
    assert len(page["items"]) == 1


async def test_user_cannot_see_others_tasks(auth_client, client):
    task = await _create(auth_client)

    # Second utilisateur
    other = {"email": "autre@example.com", "password": "AutreMotDePasse123", "display_name": "A"}
    assert (await client.post("/api/v1/auth/register", json=other)).status_code == 201
    login = await client.post(
        "/api/v1/auth/login", json={"email": other["email"], "password": other["password"]}
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    assert (await client.get(TASKS, headers=headers)).json()["total"] == 0
    # 404 et non 403 : l'existence de la tâche n'est pas révélée
    assert (await client.get(f"{TASKS}/{task['id']}", headers=headers)).status_code == 404
    assert (
        await client.patch(f"{TASKS}/{task['id']}", json={"title": "pirate"}, headers=headers)
    ).status_code == 404
    assert (await client.delete(f"{TASKS}/{task['id']}", headers=headers)).status_code == 404
