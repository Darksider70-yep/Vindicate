// Mock blockchain interaction for demo
let mockDB = [];

export const issueCredential = (owner, hash) => {
  const credential = {
    id: mockDB.length + 1,
    owner,
    hash,
    issuer: "0xMockIssuer",
    timestamp: Date.now()
  };
  mockDB.push(credential);
  return credential;
};

export const getCredential = (id) => {
  return mockDB.find(c => c.id === id) || null;
};

export const getAllCredentials = () => mockDB;
