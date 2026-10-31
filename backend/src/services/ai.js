const { GoogleGenAI } = require('@google/genai');
const { aiResponseSchema } = require('../schemas');

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

function formatPrice(value, currency) {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value) || 0));
  return formatted;
}

function buildFallbackStrategy({ group_size, zip_code, pincode, year, make, model, listed_price, msrp, currency = 'INR', showroom_name }) {
  const priceGap = Math.max(0, Number(msrp || listed_price || 0) - Number(listed_price || 0));
  const discount = Math.min(Math.max((priceGap / (Number(msrp || listed_price || 1) || 1)) * 100, 6), 16);
  const targetPrice = Number(listed_price || 0) * (1 - discount / 100);
  const location = pincode || zip_code;
  const vehicleYear = year ? `${year} ` : '';
  const targetPriceLabel = formatPrice(targetPrice, currency);
  const offerSource = showroom_name ? `The available listing is from ${showroom_name}.` : 'Use current local showroom quotes to anchor the discussion.';

  return {
    target_group_discount_percentage: Number(discount.toFixed(1)),
    realistic_target_price_per_car: Number(targetPrice.toFixed(2)),
    leverage_points: [
      `A buyer group of ${group_size} can ask for a group offer in PIN/ZIP area ${location}.`,
      `You are ready to buy today, which creates urgency and gives the dealer a reason to protect margin with a faster close.`,
      `${offerSource} The difference between the returned ex-showroom price and offer is ${formatPrice(priceGap, currency)}.`,
      'All targets are estimates, not guaranteed dealer quotes. Verify taxes, fees, insurance, and offer validity directly.',
    ],
    email_script_to_dealer: `Subject: ${vehicleYear}${make} ${model} group offer inquiry for ${group_size} buyers\n\nWe are a group of ${group_size} buyers in ${location} interested in the ${vehicleYear}${make} ${model}. Please share your best current ex-showroom offer for a group purchase, including the offer validity, stock, and all applicable charges. We are comparing written quotes and would like to discuss a target near ${targetPriceLabel} before on-road costs. This target is an estimate, not a guaranteed price.`,
    in_person_negotiation_tactic: `Ask for a written, itemized quote for the ${vehicleYear}${make} ${model}, separating ex-showroom price, discount, RTO, insurance, and taxes. Compare it with other local offers and make clear that the group's target near ${targetPriceLabel} is an estimate, not an out-the-door commitment.`,
  };
}

async function generateNegotiationStrategy({
  group_size,
  zip_code,
  pincode,
  year,
  make,
  model,
  listed_price,
  msrp,
  currency,
  showroom_name,
}) {
  if (!ai) {
    return aiResponseSchema.parse(
      buildFallbackStrategy({
        group_size,
        zip_code,
        pincode,
        year,
        make,
        model,
        listed_price,
        msrp,
        currency,
        showroom_name,
      }),
    );
  }

  const prompt = [
    'You are an expert automotive negotiator and dealership insider.',
    'Your objective is to help consumer buyer groups leverage their numbers to get the maximum possible discount on a specific vehicle.',
    'You understand fleet sales, volume bonuses, holdbacks, and local market dynamics.',
    'You must provide highly specific, actionable, and realistic negotiation scripts and target prices based on the group size and the specific car they want.',
    'Respond ONLY in a valid JSON object with the exact keys target_group_discount_percentage, realistic_target_price_per_car, leverage_points, email_script_to_dealer, and in_person_negotiation_tactic.',
    `We have a buyer group of ${group_size} people near PIN/ZIP ${pincode || zip_code}.`,
    `We are interested in a ${year ? `${year} ` : ''}${make} ${model}.`,
    `The returned ex-showroom price is ${formatPrice(msrp, currency || 'INR')} and its current dealer offer is ${formatPrice(listed_price, currency || 'INR')}.`,
    showroom_name ? `The offer came from ${showroom_name}.` : '',
    'Use the supplied offer information as the market data. Clearly state that your target is estimated and not a guaranteed quote. Exclude on-road costs unless they are supplied.',
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
