const {
  cohorts: demoCohorts,
  offers: demoOffers,
  showrooms: demoShowrooms,
} = require('./bhubaneswarDemo');

const store = {
  users: [],
  dealerships: demoShowrooms.map((showroom) => ({
    id: showroom.id,
    name: showroom.name,
    address: showroom.address,
    zip_code: showroom.pincode,
    locality: showroom.locality,
    contact_email: null,
    contact_phone: null,
  })),
  inventory: demoOffers.map((offer) => ({
    id: offer.id,
    dealership_id: offer.showroom_id,
    make: offer.make,
    model: offer.model,
    trim: offer.variant,
    listed_price: offer.final_price_inr,
    msrp: offer.ex_showroom_price_inr,
    zip_code: offer.showroom.pincode,
    dealer_discount_inr: offer.dealer_discount_inr,
  })),
  cohorts: demoCohorts.map((cohort) => ({
    ...cohort,
    created_by: null,
    members: Array.from({ length: cohort.member_count }, (_, index) => `demo-${cohort.id}-member-${index + 1}`),
    created_at: new Date().toISOString(),
  })),
};

function normalizeZip(zip) {
  return String(zip || '').replace(/\D/g, '').slice(0, 6);
}

function isSameZipArea(zipA, zipB) {
  const left = normalizeZip(zipA);
  const right = normalizeZip(zipB);
  return !left || !right || left.slice(0, 3) === right.slice(0, 3);
}

function findDealerById(dealerId) {
  return store.dealerships.find((dealer) => dealer.id === dealerId);
}

function getInventoryResults({ make, model, zipCode }) {
  const normalizedMake = String(make || '').trim();
  const normalizedModel = String(model || '').trim();
  const zip = normalizeZip(zipCode);
  return store.inventory
    .filter((item) => (!normalizedMake || item.make.toLowerCase() === normalizedMake.toLowerCase())
      && (!normalizedModel || item.model.toLowerCase() === normalizedModel.toLowerCase())
      && isSameZipArea(item.zip_code, zip))
    .map((item) => {
      const dealer = findDealerById(item.dealership_id);
      return {
        id: item.id,
        dealership_id: item.dealership_id,
        make: item.make,
        model: item.model,
        trim: item.trim,
        listed_price: Number(item.listed_price),
        msrp: Number(item.msrp),
        delta: Number(item.listed_price) - Number(item.msrp),
        dealer_discount_inr: item.dealer_discount_inr,
        is_demo: true,
        dealership: dealer ? {
          name: dealer.name,
          address: dealer.address,
          zip_code: dealer.zip_code,
          locality: dealer.locality,
          contact_email: dealer.contact_email,
          contact_phone: dealer.contact_phone,
        } : null,
      };
    })
    .sort((left, right) => left.listed_price - right.listed_price);
}

function getCohortsForSearch({ make, model, zipCode }) {
  const normalizedMake = String(make || '').trim();
  const normalizedModel = String(model || '').trim();
  const zip = normalizeZip(zipCode);
  return store.cohorts
    .filter((cohort) => (!normalizedMake || cohort.target_make.toLowerCase() === normalizedMake.toLowerCase())
      && (!normalizedModel || cohort.target_model.toLowerCase() === normalizedModel.toLowerCase())
      && isSameZipArea(cohort.zip_code, zip))
    .map((cohort) => ({
      ...cohort,
      member_count: cohort.members.length,
      can_join: cohort.members.length < cohort.max_members,
    }));
}

function createUserRecord({ email, passwordHash, zipCode }) {
  const id = `user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const user = {
    id,
    email,
    password_hash: passwordHash,
    zip_code: normalizeZip(zipCode),
    created_at: new Date().toISOString(),
  };
  store.users.push(user);
  return user;
}

function findUserByEmail(email) {
  return store.users.find((user) => user.email.toLowerCase() === String(email).trim().toLowerCase());
}

function findUserById(id) {
  return store.users.find((user) => user.id === id);
}

function createCohortRecord({
  target_make,
  target_model,
  zip_code,
  pincode,
  city = 'Bhubaneswar',
  locality,
  lat = 20.2961,
  lng = 85.8245,
  created_by,
  max_members = 10,
  urgency = 'Ready now',
}) {
  const id = `cohort-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const cohort = {
    id,
    target_make: String(target_make).trim(),
    target_model: String(target_model).trim(),
    zip_code: normalizeZip(pincode || zip_code),
    pincode: pincode || null,
    city,
    locality: locality || null,
    lat,
    lng,
    status: 'forming',
    max_members: Number(max_members) || 10,
    target_size: Number(max_members) || 10,
    urgency: String(urgency || 'Ready now'),
    created_by: String(created_by),
    members: [String(created_by)],
    member_count: 1,
    is_demo: false,
    created_at: new Date().toISOString(),
  };
  store.cohorts.unshift(cohort);
  return cohort;
}

function joinCohortRecord({ cohortId, userId }) {
  const cohort = store.cohorts.find((entry) => entry.id === cohortId);
  if (!cohort) return null;
  if (cohort.members.includes(userId)) return cohort;
  if (cohort.members.length >= cohort.max_members) throw new Error('This cohort is already full.');
  cohort.members.push(userId);
  cohort.member_count = cohort.members.length;
  return cohort;
}

module.exports = {
  store,
  normalizeZip,
  getInventoryResults,
  getCohortsForSearch,
  createUserRecord,
  findUserByEmail,
  findUserById,
  createCohortRecord,
  joinCohortRecord,
};
