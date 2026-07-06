APPOINTMENTS = "/api/v1/appointments"


async def _create(client, **overrides):
    payload = {
        "title": "Dentiste",
        "start_at": "2026-08-10T09:00:00Z",
        "end_at": "2026-08-10T09:30:00Z",
        **overrides,
    }
    response = await client.post(APPOINTMENTS, json=payload)
    assert response.status_code == 201
    return response.json()


async def test_appointments_require_authentication(client):
    response = await client.get(APPOINTMENTS)
    assert response.status_code == 401


async def test_create_appointment_with_defaults(auth_client):
    appointment = await _create(auth_client)
    assert appointment["description"] == ""
    assert appointment["location"] is None
    assert appointment["reminder_minutes_before"] is None


async def test_create_appointment_full(auth_client):
    appointment = await _create(
        auth_client,
        description="Contrôle annuel",
        location="12 rue de la Paix",
        category="Santé",
        color="#33aaff",
        reminder_minutes_before=30,
    )
    assert appointment["location"] == "12 rue de la Paix"
    assert appointment["reminder_minutes_before"] == 30


async def test_create_appointment_rejects_empty_title(auth_client):
    response = await auth_client.post(
        APPOINTMENTS,
        json={"title": "", "start_at": "2026-08-10T09:00:00Z", "end_at": "2026-08-10T10:00:00Z"},
    )
    assert response.status_code == 422


async def test_create_appointment_rejects_end_before_start(auth_client):
    response = await auth_client.post(
        APPOINTMENTS,
        json={
            "title": "Impossible",
            "start_at": "2026-08-10T10:00:00Z",
            "end_at": "2026-08-10T09:00:00Z",
        },
    )
    assert response.status_code == 422


async def test_create_appointment_rejects_negative_reminder(auth_client):
    response = await auth_client.post(
        APPOINTMENTS,
        json={
            "title": "x",
            "start_at": "2026-08-10T09:00:00Z",
            "end_at": "2026-08-10T10:00:00Z",
            "reminder_minutes_before": -5,
        },
    )
    assert response.status_code == 422


async def test_list_ordered_by_start_and_get(auth_client):
    later = await _create(auth_client, title="Après-midi", start_at="2026-08-10T14:00:00Z",
                          end_at="2026-08-10T15:00:00Z")
    earlier = await _create(auth_client, title="Matin", start_at="2026-08-10T08:00:00Z",
                            end_at="2026-08-10T08:30:00Z")

    listing = (await auth_client.get(APPOINTMENTS)).json()
    assert listing["total"] == 2
    assert [item["id"] for item in listing["items"]] == [earlier["id"], later["id"]]

    detail = await auth_client.get(f"{APPOINTMENTS}/{later['id']}")
    assert detail.status_code == 200


async def test_list_filters_by_period(auth_client):
    await _create(auth_client, title="Juillet", start_at="2026-07-15T09:00:00Z",
                  end_at="2026-07-15T10:00:00Z")
    await _create(auth_client, title="Août", start_at="2026-08-15T09:00:00Z",
                  end_at="2026-08-15T10:00:00Z")

    august = (
        await auth_client.get(
            APPOINTMENTS, params={"from": "2026-08-01T00:00:00Z", "to": "2026-09-01T00:00:00Z"}
        )
    ).json()
    assert august["total"] == 1
    assert august["items"][0]["title"] == "Août"


async def test_list_filters_by_category_and_text(auth_client):
    await _create(auth_client, title="Dentiste", category="Santé")
    await _create(auth_client, title="Entretien annuel", category="Travail",
                  location="Salle Ada Lovelace")

    by_category = (await auth_client.get(APPOINTMENTS, params={"category": "Santé"})).json()
    assert by_category["total"] == 1
    assert by_category["items"][0]["title"] == "Dentiste"

    by_text = (await auth_client.get(APPOINTMENTS, params={"q": "lovelace"})).json()
    assert by_text["total"] == 1
    assert by_text["items"][0]["title"] == "Entretien annuel"


async def test_patch_updates_only_given_fields(auth_client):
    appointment = await _create(auth_client, description="garder")
    response = await auth_client.patch(
        f"{APPOINTMENTS}/{appointment['id']}", json={"title": "Nouveau titre"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Nouveau titre"
    assert body["description"] == "garder"


async def test_patch_rejects_incoherent_period(auth_client):
    appointment = await _create(auth_client)
    # end_at seul, antérieur au start_at existant
    response = await auth_client.patch(
        f"{APPOINTMENTS}/{appointment['id']}", json={"end_at": "2026-08-10T08:00:00Z"}
    )
    assert response.status_code == 422


async def test_patch_can_clear_reminder(auth_client):
    appointment = await _create(auth_client, reminder_minutes_before=15)
    response = await auth_client.patch(
        f"{APPOINTMENTS}/{appointment['id']}", json={"reminder_minutes_before": None}
    )
    assert response.status_code == 200
    assert response.json()["reminder_minutes_before"] is None


async def test_delete_appointment(auth_client):
    appointment = await _create(auth_client)
    response = await auth_client.delete(f"{APPOINTMENTS}/{appointment['id']}")
    assert response.status_code == 204
    assert (await auth_client.get(f"{APPOINTMENTS}/{appointment['id']}")).status_code == 404


async def test_user_cannot_see_others_appointments(auth_client, client):
    appointment = await _create(auth_client)

    # Second utilisateur
    other = {"email": "autre@example.com", "password": "AutreMotDePasse123", "display_name": "A"}
    assert (await client.post("/api/v1/auth/register", json=other)).status_code == 201
    login = await client.post(
        "/api/v1/auth/login", json={"email": other["email"], "password": other["password"]}
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    assert (await client.get(APPOINTMENTS, headers=headers)).json()["total"] == 0
    # 404 et non 403 : l'existence du rendez-vous n'est pas révélée
    assert (
        await client.get(f"{APPOINTMENTS}/{appointment['id']}", headers=headers)
    ).status_code == 404
    assert (
        await client.patch(
            f"{APPOINTMENTS}/{appointment['id']}", json={"title": "pirate"}, headers=headers
        )
    ).status_code == 404
    assert (
        await client.delete(f"{APPOINTMENTS}/{appointment['id']}", headers=headers)
    ).status_code == 404
