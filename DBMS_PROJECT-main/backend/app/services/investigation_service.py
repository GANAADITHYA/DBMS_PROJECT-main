from __future__ import annotations

from uuid import UUID

from app.db import procedures
from app.db.transactions import connection
from app.errors.exceptions import NotFoundError
from app.repositories import event_repository
from app.schemas.common import LinkMode
from app.schemas.impact import ImpactAggregateItem
from app.schemas.investigation import BlastRadiusResult, InvestigationResult, TraversalNode

UNIQUENESS_NOTE = (
    "Each event appears once, using the shortest recorded path depth. "
    "Rejected relationships are excluded from traversal."
)
IMPACT_NOTE = (
    "Structured impacts are grouped by affected object, impact type, unit and "
    "verification status. Estimated and verified values are never combined, and "
    "incompatible units are never summed. Headline quantity uses MAX(quantity)."
)


def _include_suspected(link_mode: LinkMode) -> bool:
    return link_mode == "include_suspected"


def _nodes(rows: list[dict]) -> list[TraversalNode]:
    return [
        TraversalNode(
            event_id=row["event_id"],
            event_code=row["event_code"],
            title=row["title"],
            minimum_depth=row["minimum_depth"],
            path_event_ids=list(row["path_event_ids"] or []),
        )
        for row in rows
    ]


async def root_causes(event_id: UUID, link_mode: LinkMode) -> InvestigationResult:
    async with connection() as conn:
        if not await event_repository.event_exists(conn, event_id):
            raise NotFoundError("The requested event was not found.")
        rows = await procedures.trace_root_causes(conn, event_id, _include_suspected(link_mode))
    return InvestigationResult(
        start_event_id=event_id,
        link_mode=link_mode,
        uniqueness_note=UNIQUENESS_NOTE,
        nodes=_nodes(rows),
    )


async def blast_radius(event_id: UUID, link_mode: LinkMode) -> BlastRadiusResult:
    async with connection() as conn:
        if not await event_repository.event_exists(conn, event_id):
            raise NotFoundError("The requested event was not found.")
        nodes = await procedures.trace_blast_radius(conn, event_id, _include_suspected(link_mode))
        impacts = await procedures.blast_radius_impact_summary(
            conn, event_id, _include_suspected(link_mode)
        )
    return BlastRadiusResult(
        start_event_id=event_id,
        link_mode=link_mode,
        uniqueness_note=UNIQUENESS_NOTE,
        nodes=_nodes(nodes),
        impacts=[ImpactAggregateItem.model_validate(row) for row in impacts],
        impact_grouping_note=IMPACT_NOTE,
    )
