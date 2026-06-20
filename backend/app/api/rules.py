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
                valid_currencies=r.valid_currencies,
                min_amount=r.min_amount,
                max_amount=r.max_amount,
                min_quantity=r.min_quantity,
                max_quantity=r.max_quantity,
                allow_future_dates=r.allow_future_dates,
                required_fields=r.required_fields,
                email_domain_whitelist=r.email_domain_whitelist,
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
            valid_currencies=data.valid_currencies,
            min_amount=data.min_amount,
            max_amount=data.max_amount,
            min_quantity=data.min_quantity,
            max_quantity=data.max_quantity,
            allow_future_dates=data.allow_future_dates,
            required_fields=data.required_fields,
            email_domain_whitelist=data.email_domain_whitelist,
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
            valid_currencies=rule.valid_currencies,
            min_amount=rule.min_amount,
            max_amount=rule.max_amount,
            min_quantity=rule.min_quantity,
            max_quantity=rule.max_quantity,
            allow_future_dates=rule.allow_future_dates,
            required_fields=rule.required_fields,
            email_domain_whitelist=rule.email_domain_whitelist,
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
        if data.valid_currencies is not None:
            rule.valid_currencies = data.valid_currencies
        if data.min_amount is not None:
            rule.min_amount = data.min_amount
        if data.max_amount is not None:
            rule.max_amount = data.max_amount
        if data.min_quantity is not None:
            rule.min_quantity = data.min_quantity
        if data.max_quantity is not None:
            rule.max_quantity = data.max_quantity
        if data.allow_future_dates is not None:
            rule.allow_future_dates = data.allow_future_dates
        if data.required_fields is not None:
            rule.required_fields = data.required_fields
        if data.email_domain_whitelist is not None:
            rule.email_domain_whitelist = data.email_domain_whitelist
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
            valid_currencies=rule.valid_currencies,
            min_amount=rule.min_amount,
            max_amount=rule.max_amount,
            min_quantity=rule.min_quantity,
            max_quantity=rule.max_quantity,
            allow_future_dates=rule.allow_future_dates,
            required_fields=rule.required_fields,
            email_domain_whitelist=rule.email_domain_whitelist,
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
