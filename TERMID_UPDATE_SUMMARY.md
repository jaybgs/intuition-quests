# TermId/CurveId Integration Summary

## What Was Updated

This update integrates proper `termId` and `curveId` handling based on the Intuition SDK patterns.

## Changes Made

### 1. Updated CreateSpace.sol ✅

**Before:**
- Returned `uint256` spaceIdentityId
- Used simplified `createAtom` interface

**After:**
- Returns `bytes32` spaceTermId (matches SDK's `result.state.termId`)
- Uses proper MultiVault v2 interface with `createAtoms` batch function
- Event now emits `bytes32` termId

**Key Changes:**
```solidity
// Old
function createSpace(...) returns (uint256 spaceIdentityId)

// New  
function createSpace(...) returns (bytes32 spaceTermId)
```

### 2. Updated CreateQuest.sol ✅

**Before:**
- Returned `uint256` questAtomId
- Used simplified `createAtom` interface

**After:**
- Returns `bytes32` questTermId (matches SDK's `result.state.termId`)
- Uses proper MultiVault v2 interface with `createAtoms` batch function
- Event now emits `bytes32` termId

**Key Changes:**
```solidity
// Old
function createQuest(...) returns (uint256 questAtomId)

// New
function createQuest(...) returns (bytes32 questTermId)
```

### 3. Created Documentation ✅

- **TERMID_CURVEID_GUIDE.md**: Comprehensive guide on using termIds and curveIds
  - How to create atoms with SDK
  - How to create triples (claims) with SDK
  - How to fetch existing atoms/triples
  - How to deposit with curveIds
  - Best practices and migration notes

## SDK Integration Patterns

### Creating Atoms

```typescript
const result = await createAtomFromString(
  { walletClient, publicClient, address },
  'My First Atom'
);
console.log('Atom ID:', result.state.termId); // bytes32 termId
```

### Creating Triples (Claims)

```typescript
const triple = await createTripleStatement(
  { walletClient, publicClient, address },
  {
    args: [
      subject.state.termId,
      predicate.state.termId,
      object.state.termId,
    ],
    value: 1_000_000_000_000_000_000n,
  }
);
console.log('Triple ID:', triple.state.termId); // bytes32 termId
```

### Fetching Existing Atoms/Triples

```typescript
import { getAtomDetails, getTripleDetails } from '@0xintuition/sdk';

const atom = await getAtomDetails(atomTermId);
const triple = await getTripleDetails(tripleTermId);
```

## Important Notes

1. **TermIds are bytes32**: All termIds are `bytes32` values (hex strings in JS/TS)
2. **SDK Compatibility**: Contract return values now match SDK return values
3. **Frontend Updates Needed**: 
   - Update frontend to handle `bytes32` termIds instead of `uint256`
   - Update storage to use hex string format
   - Update API/database to store termIds as strings

## Next Steps

1. **Update Deployment Scripts**: 
   - Update scripts to handle `bytes32` return values
   - Update deployment JSON to store termIds as hex strings

2. **Update Frontend Services**:
   - Update `spaceService.ts` to use bytes32 termIds
   - Update `questService.ts` to use bytes32 termIds
   - Update all components that reference atom IDs

3. **Test Integration**:
   - Test atom creation with updated contracts
   - Test termId storage and retrieval
   - Test triple creation using SDK

4. **Database Migration** (if needed):
   - Migrate stored `uint256` atom IDs to `bytes32` termIds
   - Update schema to use string/varchar for termIds

## Files Modified

- ✅ `contracts/CreateSpace.sol` - Updated to use bytes32 termIds
- ✅ `contracts/CreateQuest.sol` - Updated to use bytes32 termIds
- ✅ `TERMID_CURVEID_GUIDE.md` - New comprehensive guide
- ✅ `TERMID_UPDATE_SUMMARY.md` - This summary document

## Files That May Need Updates

- `frontend/src/services/spaceService.ts` - Handle bytes32 termIds
- `frontend/src/services/questService.ts` - Handle bytes32 termIds
- `frontend/src/components/SpaceBuilder.tsx` - Update termId handling
- `scripts/deploy-create-space.js` - Update for bytes32 return values
- `scripts/deploy-create-quest.js` - Update for bytes32 return values
- Backend API models - Update to use string termIds

## Testing Checklist

- [ ] Deploy updated CreateSpace contract
- [ ] Deploy updated CreateQuest contract
- [ ] Test creating a space and verify termId format
- [ ] Test creating a quest and verify termId format
- [ ] Test fetching termId using SDK's `getAtomDetails`
- [ ] Test creating a triple claim using SDK
- [ ] Verify termIds are stored correctly in database
- [ ] Update frontend to handle bytes32 termIds
- [ ] End-to-end test: Create space → Create quest → Create claim

## References

- Intuition Discord information on termIds/curveIds
- TERMID_CURVEID_GUIDE.md for detailed usage patterns
- Intuition SDK documentation

