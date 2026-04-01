# Bily Card v2 Architecture

## 1) Architecture Plan

- **Server-first App Router**: Pages fetch from server modules, not client pricing logic.
- **Single pricing engine**: `src/modules/pricing/engine.ts` is the only price calculator.
- **Single stock engine**: `src/modules/stock/engine.ts` resolves availability.
- **Catalog service**: `src/modules/catalog/service.ts` normalizes list/detail models and caches output.
- **Provider abstraction**: `src/modules/providers/types.ts` + adapters.
- **Security boundary**: Cookie session (`httpOnly`), role guards, middleware rate limit.
- **Operational domains**: Auth, Catalog, Wallet, Orders, Admin modules with typed service functions.
- **Clean API routes**: Thin routes in `src/app/api/*` that call feature services.

## 2) Folder Structure

- `src/app`: App Router pages and route handlers.
- `src/components`: UI building blocks and product/admin views.
- `src/features`: Use-case services (`auth`, `wallet`, `orders`).
- `src/modules`: Cross-domain engines/infrastructure (`db`, `pricing`, `stock`, `providers`, `catalog`, `security`, `cache`).
- `src/domain/models`: Mongoose schemas only.
- `src/domain/types`: Typed display models for UI/API.
- `src/core`: Shared helpers (`env`, `http`, `money`).
- `docs`: Architecture and migration docs.

## 3) Data Models

Implemented and active:
- `User`
- `WalletTransaction`
- `WalletDepositRequest`
- `Order`
- `OrderAuditLog`
- `Product`
- `ProductPricingRule`
- `ProductProviderLink`
- `ProviderCatalogCache`
- `ManualOrder`
- `ManualOrderAuditLog`
- `ProviderSettings`

## 4) Source Of Truth Map

- **Price**:
  - Provider-backed product: provider cached/raw cost -> margin -> optional discount -> rounding
  - Manual product/package: manual cost baseline -> same pricing engine
  - Final display value comes from `Pricing Engine` output only
- **Stock**:
  - Provider-backed: provider availability (or manual override)
  - Manual: manual stock / active-visible flags
  - Final visibility comes from `Stock Engine` output only
- **UI**:
  - Reads only normalized catalog display model (`CatalogListItem`, `CatalogDetail`)
  - No raw provider IDs/costs/errors exposed

## 5) Migration / Cleanup Strategy

### Business reference only
- Product families, package labels, category taxonomy, customer flows, admin actions.

### Must never be moved
- Old pricing calculations in UI/components.
- Provider internals leaked to frontend.
- Duplicate APIs and fallback chains.
- Text-parsed price logic.

### Remove completely
- Legacy `app/` implementation from old structure.
- Unused/dead utilities and duplicate modules.

### Replace fully
- Auth -> secure cookie session.
- Catalog -> normalized cached catalog service.
- Orders -> transactional wallet debit/refund pipeline.
- Admin -> direct controls with simple routes.

### Redesign from zero
- Pricing/Stock engines.
- Provider adapter and routing shape.
- Product popup data source (server normalized model only).

