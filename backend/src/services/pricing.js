function getGroupDiscountBasisPoints(memberCount, tiers) {
  const tier = tiers
    .filter((item) => Number(item.min_members) <= memberCount)
    .sort((left, right) => Number(right.min_members) - Number(left.min_members))[0];
  return tier ? Math.round(Number(tier.extra_discount_pct) * 100) : 0;
}

function calculateGroupPrice(finalPriceInr, memberCount, tiers) {
  const price = BigInt(finalPriceInr);
  const discountBasisPoints = BigInt(getGroupDiscountBasisPoints(memberCount, tiers));
  const estimatedPrice = (price * (10000n - discountBasisPoints)) / 10000n;
  return Number(estimatedPrice);
}

module.exports = { getGroupDiscountBasisPoints, calculateGroupPrice };
