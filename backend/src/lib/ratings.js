function withRating({ reviews, ...property }) {
  return {
    ...property,
    avgRating: reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : null,
    reviewCount: reviews.length,
  };
}

module.exports = { withRating };
