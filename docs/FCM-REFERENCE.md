# FCM Reference Documentation

This document contains the official FCM specifications for implementation reference.

---

## FCM Architecture Overview

FCM is an integrated system composed of three core components:

```
ALP (Automated Lending Platform) ─┐
FYV (Flow Yield Vaults) ──────────┼──► Flow Credit Market (FCM)
MOET (Synthetic Stablecoin) ──────┘
```

### Component Responsibilities

**ALP (Automated Lending Platform):**
- Manages collateral deposits and debt positions
- Provides automated rebalancing to maintain position health
- Uses DeFi Actions for composability
- Implements liquidation prevention mechanisms

**FYV (Flow Yield Vaults):**
- Deploys borrowed capital into optimal yield strategies
- Automatically compounds returns
- Provides liquidity for ALP liquidation prevention
- Manages risk through auto-balancing

**MOET (Synthetic Stablecoin):**
- Serves as the unit of account for all pricing
- Primary borrowed asset in ALP
- Medium of exchange between components
- Maintains stability through over-collateralization

---

## Capital Flow Cycle

### Phase 1: Initial Deposit and Borrowing
```
User deposits: 1000 FLOW worth $1000
↓
ALP calculates:
  - Effective collateral: $1000 × 0.8 = $800
  - Target health: 1.3
  - Borrow amount: $800 / 1.3 = $615.38 MOET
↓
ALP auto-borrows: 615.38 MOET
↓
MOET flows to: FYV strategy (via DrawDownSink)
↓
FYV swaps: 615.38 MOET → 615.38 YieldToken
↓
Status:
  - Your ALP position: 1000 FLOW collateral, 615.38 MOET debt
  - Your FYV position: 615.38 YieldToken generating yield
  - Health factor: 1.3 ✓
```

### Phase 2: Yield Generation
```
Time passes...
↓
FYV Strategy generates yield:
  - Trading fees from LP positions
  - Farming rewards
  - Interest from lending
↓
Example after 1 month:
  - YieldToken value: 615.38 → 625.00 (+1.5% return)
  - Yield earned: ~$10
↓
FYV holds:
  - Original: 615.38 YieldToken
  - Plus accumulated yield
```

### Phase 3: Price Drop & Auto-Protection
```
FLOW price drops: $1.00 → $0.80 (-20%)
↓
ALP detects:
  - Collateral: 1000 FLOW @ $0.80 = $800 × 0.8 = $640 effective
  - Debt: 615.38 MOET
  - New health: 640 / 615.38 = 1.04 (below min 1.1!)
↓
ALP triggers rebalancing:
  - Calculates required repayment
  - Target debt: $640 / 1.3 = $492.31 MOET
  - Needs to repay: 615.38 - 492.31 = 123.07 MOET
↓
ALP pulls from FYV (TopUpSource):
  - FYV swaps: 123.07 YieldToken → 123.07 MOET
  - Sends MOET to ALP
↓
ALP repays debt:
  - New debt: 492.31 MOET
  - New health: 640 / 492.31 = 1.3 ✓
↓
Status:
  - ALP position: 1000 FLOW, 492.31 MOET debt, HF=1.3
  - FYV position: ~492 YieldToken remaining
  - Liquidation prevented! ✓
```

### Phase 4: Price Recovery
```
FLOW price recovers: $0.80 → $1.00
↓
ALP detects:
  - Collateral: 1000 FLOW @ $1.00 = $1000 × 0.8 = $800 effective
  - Debt: 492.31 MOET
  - New health: 800 / 492.31 = 1.625 (above max 1.5!)
↓
ALP triggers rebalancing:
  - Can borrow more to reach target health
  - Target debt: $800 / 1.3 = $615.38 MOET
  - Can borrow: 615.38 - 492.31 = 123.07 MOET
↓
ALP auto-borrows:
  - Borrows: 123.07 MOET
  - Pushes to FYV (DrawDownSink)
↓
FYV deploys:
  - Swaps: 123.07 MOET → 123.07 YieldToken
  - Back to ~615 YieldToken
↓
Status:
  - ALP position: 1000 FLOW, 615.38 MOET debt, HF=1.3
  - FYV position: ~615 YieldToken generating yield
  - Fully rebalanced and optimized! ✓
```

---

## Mathematical Foundations

### Health Factor
```
Health Factor = Effective Collateral / Effective Debt

Effective Collateral = Token Amount × Price × Collateral Factor
Effective Debt = Borrowed Amount × Price
```

### Health Factor Thresholds
```
HF < 1.0   → Liquidatable (immediate danger!)
HF = 1.0-1.1 → At risk (very close to liquidation)
HF = 1.1-1.3 → Below target (should rebalance up - repay debt)
HF = 1.3     → Target (optimal!)
HF = 1.3-1.5 → Above target (can borrow more)
HF > 1.5     → Overcollateralized (should rebalance down - borrow more)
```

### Maximum Borrowing Capacity
```
MaxBorrow = Effective Collateral / Target Health
```

### Overcollateralized Rebalancing (HF > HF_max)
```
AdditionalBorrow = (EC / HF_target) - ED_current

Example:
Current state:
- EC = $800
- ED = $400
- HF = 800 / 400 = 2.0 (> HF_max of 1.5)

Calculate additional borrow:
ED_target = 800 / 1.3 = $615.38
Additional = 615.38 - 400 = $215.38 MOET

After borrowing $215.38:
- EC = $800 (unchanged)
- ED = $615.38
- HF = 800 / 615.38 = 1.30 ✓
```

**CRITICAL**: Note that EC = $800 (unchanged) - collateral does NOT increase!
The borrowed MOET goes to FYV, not to buy more collateral.

### Undercollateralized Rebalancing (HF < HF_min)
```
RequiredRepayment = ED_current - (EC / HF_target)

Example:
Price drops! Collateral value decreases.

New state:
- EC = $640 (was $800, FLOW dropped 20%)
- ED = $615.38 (unchanged)
- HF = 640 / 615.38 = 1.04 (< HF_min of 1.1)

Calculate required repayment:
ED_target = 640 / 1.3 = $492.31
Repayment = 615.38 - 492.31 = $123.07 MOET

After repaying $123.07:
- EC = $640 (unchanged)
- ED = $492.31
- HF = 640 / 492.31 = 1.30 ✓
```

---

## DeFi Actions Integration

### Sink Pattern (Push) - ALP → FYV
```typescript
// ALP pushes to FYV when overcollateralized
access(all) resource interface Sink {
    access(all) fun deposit(vault: @{FungibleToken.Vault})
}

// Usage: DrawDownSink
let sink = fyvStrategy.createSink()
sink.deposit(vault: <-moetVault)
```

### Source Pattern (Pull) - FYV → ALP
```typescript
// ALP pulls from FYV when undercollateralized
access(all) resource interface Source {
    access(all) fun withdraw(amount: UFix64, type: Type): @{FungibleToken.Vault}
}

// Usage: TopUpSource
let source = fyvStrategy.createSource()
let moet <- source.withdraw(amount: 100.0, type: Type<@MOET.Vault>())
```

---

## Key FCM Behaviors

### 1. Auto-Borrowing
When depositing collateral, ALP automatically borrows MOET to reach target health (1.3).

### 2. Auto-Deployment
Borrowed MOET flows directly to FYV yield strategies via DrawDownSink.

### 3. Auto-Protection (Undercollateralized)
When health drops below minimum (1.1):
1. ALP calculates required repayment
2. ALP pulls from FYV via TopUpSource
3. FYV swaps YieldToken → MOET
4. ALP repays debt
5. Health restored to target (1.3)

### 4. Auto-Leverage (Overcollateralized)
When health rises above maximum (1.5):
1. ALP calculates borrowing capacity
2. ALP borrows additional MOET
3. ALP pushes to FYV via DrawDownSink
4. FYV swaps MOET → YieldToken
5. Health restored to target (1.3)

### 5. Yield Generation
FYV strategies generate yield through:
- Trading fees from LP positions
- Farming rewards
- Interest from lending
- Token appreciation

---

## Summary: FCM vs Traditional Lending

| Aspect | Traditional | FCM |
|--------|-------------|-----|
| Downward Rebalancing | None (manual only) | Automatic via TopUpSource |
| Upward Rebalancing | None | Automatic via DrawDownSink |
| Borrowed Funds | User manages | Auto-deployed to FYV |
| Yield on Borrowed | None (idle capital) | FYV generates yield |
| Liquidation Risk | High | Low (FYV provides liquidity) |
| User Intervention | Constant monitoring | None (fully automated) |

---

## Implementation Notes

1. **Health Factor Calculation**: Only considers Collateral vs Debt (FYV is separate)
2. **FYV is NOT collateral**: FYV balance doesn't affect health factor
3. **Rebalancing Priority**: FYV provides liquidity first, then sell collateral if needed
4. **Total User Value**: ALP Equity (Collateral - Debt) + FYV Balance
