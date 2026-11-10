from __future__ import annotations

from collections.abc import Collection

from app.core.security import CurrentUser
from app.errors.exceptions import AuthorizationError

ADMINISTRATOR = "administrator"
EVENT_REPORTER = "event_reporter"
EVENT_INVESTIGATOR = "event_investigator"
DECISION_MAKER = "decision_maker"

KNOWN_ROLES = frozenset({ADMINISTRATOR, EVENT_REPORTER, EVENT_INVESTIGATOR, DECISION_MAKER})

EVENT_READ = "event:read"
EVENT_CREATE = "event:create"
EVENT_UPDATE = "event:update"
EVENT_UPDATE_OWN_OPEN = "event:update_own_open"
EVENT_STATUS = "event:status"
EVENT_CLOSE = "event:close"
EVENT_VOID = "event:void"
RELATIONSHIP_READ = "relationship:read"
RELATIONSHIP_WRITE = "relationship:write"
EVIDENCE_WRITE = "evidence:write"
IMPACT_READ = "impact:read"
IMPACT_WRITE = "impact:write"
INVESTIGATE = "investigate"
DASHBOARD_READ = "dashboard:read"
REPORT_READ = "report:read"
REFERENCE_READ = "reference:read"

# Provisional until the team finalizes D-05/D-06.
ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    ADMINISTRATOR: frozenset(
        {
            EVENT_READ,
            EVENT_CREATE,
            EVENT_UPDATE,
            EVENT_STATUS,
            EVENT_CLOSE,
            EVENT_VOID,
            RELATIONSHIP_READ,
            RELATIONSHIP_WRITE,
            EVIDENCE_WRITE,
            IMPACT_READ,
            IMPACT_WRITE,
            INVESTIGATE,
            DASHBOARD_READ,
            REPORT_READ,
            REFERENCE_READ,
        }
    ),
    EVENT_REPORTER: frozenset(
        {
            EVENT_READ,
            EVENT_CREATE,
            EVENT_UPDATE_OWN_OPEN,
            RELATIONSHIP_READ,
            IMPACT_READ,
            DASHBOARD_READ,
            REFERENCE_READ,
        }
    ),
    EVENT_INVESTIGATOR: frozenset(
        {
            EVENT_READ,
            EVENT_CREATE,
            EVENT_UPDATE,
            EVENT_STATUS,
            EVENT_CLOSE,
            RELATIONSHIP_READ,
            RELATIONSHIP_WRITE,
            EVIDENCE_WRITE,
            IMPACT_READ,
            IMPACT_WRITE,
            INVESTIGATE,
            DASHBOARD_READ,
            REPORT_READ,
            REFERENCE_READ,
        }
    ),
    DECISION_MAKER: frozenset(
        {
            EVENT_READ,
            RELATIONSHIP_READ,
            IMPACT_READ,
            INVESTIGATE,
            DASHBOARD_READ,
            REPORT_READ,
            REFERENCE_READ,
        }
    ),
}


def user_permissions(user: CurrentUser) -> set[str]:
    permissions: set[str] = set()
    for role in user.roles:
        permissions.update(ROLE_PERMISSIONS.get(role, frozenset()))
    return permissions


def has_permission(user: CurrentUser, permission: str) -> bool:
    return permission in user_permissions(user)


def require_permission(user: CurrentUser, permission: str) -> None:
    if not has_permission(user, permission):
        raise AuthorizationError()


def require_any_role(user: CurrentUser, roles: Collection[str]) -> None:
    if user.roles.isdisjoint(set(roles)):
        raise AuthorizationError()
