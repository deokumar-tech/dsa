const { GoogleGenAI } = require('@google/genai');
const { aiResponseSchema } = require('../schemas');

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

function buildFallbackStrategy({ group_size, zip_code, year, make, model, listed_price, msrp }) {
  const priceGap = Math.max(0, Number(msrp || listed_price || 0) - Number(listed_price || 0));
  const discount = Math.min(Math.max((priceGap / (Number(msrp || listed_price || 1) || 1)) * 100, 6), 16);
  const targetPrice = Number(listed_price || 0) * (1 - discount / 100);

  return {
    target_group_discount_percentage: Number(discount.toFixed(1)),
    realistic_target_price_per_car: Number(targetPrice.toFixed(2)),
    leverage_points: [
      `A buyer group of ${group_size} qualifies as a meaningful fleet-volume conversation in zip code ${zip_code}.`,
      `You are ready to buy today, which creates urgency and gives the dealer a reason to protect margin with a faster close.`,
      `The local asking price is below MSRP by ${Number((Math.max(0, Number(msrp) - Number(listed_price)) / Number(msrp || 1)) * 100).toFixed(1)}%, which gives room to negotiate with a realistic target.`,
    ],
    email_script_to_dealer: `Subject: ${year} ${make} ${model} volume inquiry for ${group_size} buyers\n\nWe are a buyer group of ${group_size} consumers ready to purchase a ${year} ${make} ${model} in ${zip_code} immediately. We want to understand the strongest price you can offer if we move quickly and commit as a group. We are evaluating offers against a target price of $${targetPrice.toFixed(2)} before fees and would like to compare your best volume-based package.`,
    in_person_negotiation_tactic: `Lead with the fact that the group is ready to purchase today, ask for the dealer's best fleet-style price, and push the conversation toward a no-haggle target number. Position the deal as a quick close with multiple buyers if the dealer can meet an out-the-door figure near $${targetPrice.toFixed(2)}.`,
  };
}

async function generateNegotiationStrategy({
  group_size,
  zip_code,
  year,
  make,
  model,
  listed_price,
  msrp,
}) {
  if (!ai) {
    return aiResponseSchema.parse(
      buildFallbackStrategy({
        group_size,
        zip_code,
        year,
        make,
        model,
        listed_price,
        msrp,
      }),
    );
  }

  const prompt = [
    'You are an expert automotive negotiator and dealership insider.',
    'Your objective is to help consumer buyer groups leverage their numbers to get the maximum possible discount on a specific vehicle.',
    'You understand fleet sales, volume bonuses, holdbacks, and local market dynamics.',
    'You must provide highly specific, actionable, and realistic negotiation scripts and target prices based on the group size and the specific car they want.',
    'Respond ONLY in a valid JSON object with the exact keys target_group_discount_percentage, realistic_target_price_per_car, leverage_points, email_script_to_dealer, and in_person_negotiation_tactic.',
    `We have a buyer group of ${group_size} people located in zip code ${zip_code}.`,
    `We are all ready to buy a ${year} ${make} ${model} today.`,
    `The average local dealer listed price is $${listed_price} and MSRP is $${msrp}.`,
    'Analyze our leverage and provide a strategy.',
  ].join(' ');

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    },
  });

  const rawText = typeof response.text === 'string' ? response.text : JSON.stringify(response);
  const parsed = JSON.parse(rawText);

  return aiResponseSchema.parse(parsed);
}

module.exports = { generateNegotiationStrategy };
