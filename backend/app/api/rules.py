import uuid
from litestar import Controller, get, post, put, delete
from litestar.exceptions import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.rules import RuleCreate, RuleUpdate, RuleResponse
from app.repositories.rules import CountryRulesRepository
from app.models.rules import CountryRules


class RulesController(Controller):
    path = "/api/rules"

    @get(path="")
    async def list_rules(self, session: AsyncSession) -> list[RuleResponse]:
        """Return all active country validation rules from the database."""
        repo = CountryRulesRepository(session)
        rules = await repo.get_all()
        return [
            RuleResponse(
                id=r.id,
                country_code=r.country_code,
                country_name=r.country_name,
                phone_regex=r.phone_regex,
                date_format=r.date_format,
                valid_payment_modes=r.valid_payment_modes,
                is_active=r.is_active,
            )
            for r in rules
        ]

    @post(path="")
    async def create_rule(self, data: RuleCreate, session: AsyncSession) -> RuleResponse:
        """Insert a new country validation rule."""
        repo = CountryRulesRepository(session)
        existing = await repo.get_by_code(data.country_code)
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Active rule for country '{data.country_code}' already exists",
            )
        rule = CountryRules(
            country_code=data.country_code,
            country_name=data.country_name,
            phone_regex=data.phone_regex,
            date_format=data.date_format,
            valid_payment_modes=data.valid_payment_modes,
            is_active=data.is_active,
        )
        await repo.create(rule)
        await session.commit()
        return RuleResponse(
            id=rule.id,
            country_code=rule.country_code,
            country_name=rule.country_name,
            phone_regex=rule.phone_regex,
            date_format=rule.date_format,
            valid_payment_modes=rule.valid_payment_modes,
            is_active=rule.is_active,
        )

    @put(path="/{rule_id:uuid}")
    async def update_rule(
        self, rule_id: uuid.UUID, data: RuleUpdate, session: AsyncSession
    ) -> RuleResponse:
        """Update fields of an existing country rule."""
        rule = await session.get(CountryRules, rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail=f"Rule {rule_id} not found")
        if data.phone_regex is not None:
            rule.phone_regex = data.phone_regex
        if data.date_format is not None:
            rule.date_format = data.date_format
        if data.valid_payment_modes is not None:
            rule.valid_payment_modes = data.valid_payment_modes
        if data.is_active is not None:
            rule.is_active = data.is_active
        await session.flush()
        await session.commit()
        return RuleResponse(
            id=rule.id,
            country_code=rule.country_code,
            country_name=rule.country_name,
            phone_regex=rule.phone_regex,
            date_format=rule.date_format,
            valid_payment_modes=rule.valid_payment_modes,
            is_active=rule.is_active,
        )

    @delete(path="/{rule_id:uuid}")
    async def delete_rule(self, rule_id: uuid.UUID, session: AsyncSession) -> None:
        """Deactivate a country rule (soft delete via is_active=False)."""
        rule = await session.get(CountryRules, rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail=f"Rule {rule_id} not found")
        rule.is_active = False
        await session.flush()
        await session.commit()
