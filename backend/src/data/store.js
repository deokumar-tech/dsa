const seedDealerships = [
  {
    id: 'dealer-1',
    name: 'North Bay Toyota',
    address: '2500 Van Ness Ave, San Francisco, CA',
    zip_code: '94109',
    contact_email: 'sales@northbaytoyota.com',
    contact_phone: '(415) 555-0141',
  },
  {
    id: 'dealer-2',
    name: 'Mission Motors',
    address: '915 Mission St, San Francisco, CA',
    zip_code: '94103',
    contact_email: 'hello@missionmotors.com',
    contact_phone: '(415) 555-0193',
  },
  {
    id: 'dealer-3',
    name: 'Bay Area Honda',
    address: '6100 Auto Mall Dr, San Jose, CA',
    zip_code: '95134',
    contact_email: 'team@bayahonda.com',
    contact_phone: '(408) 555-0117',
  },
];

const seedInventory = [
  {
    id: 'inv-1',
    dealership_id: 'dealer-1',
    make: 'Toyota',
    model: 'RAV4 Hybrid',
    year: 2024,
    trim: 'XLE AWD',
    listed_price: 38950,
    msrp: 41500,
    zip_code: '94109',
  },
  {
    id: 'inv-2',
    dealership_id: 'dealer-2',
    make: 'Toyota',
    model: 'RAV4 Hybrid',
    year: 2024,
    trim: 'Limited AWD',
    listed_price: 41500,
    msrp: 43800,
    zip_code: '94103',
  },
  {
    id: 'inv-3',
    dealership_id: 'dealer-3',
    make: 'Toyota',
    model: 'Camry',
    year: 2024,
    trim: 'SE',
    listed_price: 33600,
    msrp: 35200,
    zip_code: '95134',
  },
  {
    id: 'inv-4',
    dealership_id: 'dealer-1',
    make: 'Ford',
    model: 'Mustang',
    year: 2024,
    trim: 'GT Premium',
    listed_price: 44200,
    msrp: 47450,
    zip_code: '94109',
  },
  {
    id: 'inv-5',
    dealership_id: 'dealer-2',
    make: 'Tesla',
    model: 'Model Y',
    year: 2024,
    trim: 'Long Range AWD',
    listed_price: 49800,
    msrp: 52900,
    zip_code: '94103',
  },
];

const store = {
  users: [],
  dealerships: [...seedDealerships],
  inventory: [...seedInventory],
  cohorts: [
    {
      id: 'cohort-1',
      target_make: 'Toyota',
      target_model: 'RAV4 Hybrid',
      zip_code: '94105',
      status: 'forming',
      max_members: 10,
      urgency: 'Ready now',
      created_by: 'user-demo-1',
      members: ['user-demo-1', 'user-demo-2'],
      created_at: new Date().toISOString(),
    },
    {
      id: 'cohort-2',
      target_make: 'Tesla',
      target_model: 'Model Y',
      zip_code: '94103',
      status: 'forming',
      max_members: 5,
      urgency: 'Next 30 days',
      created_by: 'user-demo-3',
      members: ['user-demo-3'],
      created_at: new Date().toISOString(),
    },
  ],
};

function normalizeZip(zip) {
  return String(zip || '').replace(/\D/g, '').slice(0, 5);
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

  const matches = store.inventory.filter((item) => {
    const makeMatches = !normalizedMake || item.make.toLowerCase() === normalizedMake.toLowerCase();
    const modelMatches = !normalizedModel || item.model.toLowerCase() === normalizedModel.toLowerCase();
    const zipMatches = isSameZipArea(item.zip_code, zip);
    return makeMatches && modelMatches && zipMatches;
  });

  return matches
    .map((item) => {
      const dealer = findDealerById(item.dealership_id);
      return {
        id: item.id,
        dealership_id: item.dealership_id,
        make: item.make,
        model: item.model,
        year: item.year,
        trim: item.trim,
        listed_price: Number(item.listed_price),
        msrp: Number(item.msrp),
        delta: Number(item.listed_price) - Number(item.msrp),
        dealership: dealer
          ? {
              name: dealer.name,
              address: dealer.address,
              zip_code: dealer.zip_code,
              contact_email: dealer.contact_email,
              contact_phone: dealer.contact_phone,
            }
          : null,
      };
    })
    .sort((a, b) => a.listed_price - b.listed_price);
}

function getCohortsForSearch({ make, model, zipCode }) {
  const normalizedMake = String(make || '').trim();
  const normalizedModel = String(model || '').trim();
  const zip = normalizeZip(zipCode);

  return store.cohorts
    .filter((cohort) => {
      const sameMake = !normalizedMake || cohort.target_make.toLowerCase() === normalizedMake.toLowerCase();
      const sameModel = !normalizedModel || cohort.target_model.toLowerCase() === normalizedModel.toLowerCase();
      const sameZip = isSameZipArea(cohort.zip_code, zip);
      return sameMake && sameModel && sameZip;
    })
    .map((cohort) => ({
      ...cohort,
      member_count: cohort.members.length,
      can_join: cohort.members.length < cohort.max_members,
      target_discount: cohort.status === 'forming' ? '12.5%' : '10.2%',
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

function createCohortRecord({ target_make, target_model, zip_code, created_by, max_members = 10, urgency = 'Ready now' }) {
  const id = `cohort-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const cohort = {
    id,
    target_make: String(target_make).trim(),
    target_model: String(target_model).trim(),
    zip_code: normalizeZip(zip_code),
    status: 'forming',
    max_members: Number(max_members) || 10,
    urgency: String(urgency || 'Ready now'),
    created_by: String(created_by),
    members: [String(created_by)],
    created_at: new Date().toISOString(),
  };
  store.cohorts.unshift(cohort);
  return cohort;
}

function joinCohortRecord({ cohortId, userId }) {
  const cohort = store.cohorts.find((entry) => entry.id === cohortId);
  if (!cohort) {
    return null;
  }

  if (cohort.members.includes(userId)) {
    return cohort;
  }

  if (cohort.members.length >= cohort.max_members) {
    throw new Error('This cohort is already full.');
  }

  cohort.members.push(userId);
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
