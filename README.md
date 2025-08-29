#Vindicate is a blockchain-based skill verification platform that allows individuals to store, share, and prove their skills and credentials in a secure, tamper-proof, and universally verifiable manner. Each verified skill or achievement is recorded as an immutable transaction on the blockchain, making it permanently traceable and publicly auditable.

Vision: 
Our vision is to empower individuals, institutions, and employers by creating a trustworthy, decentralized ecosystem for skill verification. We aim to eliminate fraud, enhance transparency, and enable universal recognition of verified skills across organizations and borders.

Features
✅ Immutable Verification: Skills and credentials are securely stored on the blockchain.

✅ Tamper-Proof: No alteration of verified credentials is possible.

✅ Universal Access: Easily share your verified skills anywhere, anytime.

✅ Skill Management: Add, track, and manage professional or academic skills.

✅ Role-Based Dashboards:

1.Issuer: Issue credentials to verified holders.

2.Holder: Manage and showcase your verified skills.

3.Verifier: Validate credentials securely and transparently.

✅ Search & Filter: Quickly find credentials by skill, issuer, or holder.

✅ Lightweight UI: Fast, responsive, and intuitive user experience with modern UI components.

Technical Architecture
Frontend: React + TypeScript, TailwindCSS, Radix-UI, Lucide Icons
Blockchain Layer:

   Smart Contracts written in Clarity deployed on the Stacks blockchain

   Every credential is an on-chain transaction, permanently stored and verifiable
Components & Utilities:

   Reusable Dialog, Accordion, OTP Input, Command Palette, and Tabs components

   Theme management with light/dark/system toggle


User (Holder) ----> Request Credential
       |
Issuer ----> Issue Credential (Signed & Recorded on Blockchain via Clarity Contract)
       |
Verifier ----> Verify Credential (Read from Blockchain)



Smart Contract:

Language: Clarity

Contract Address: ST354Y8113J0AYS1PZBTD0P74XHPPP083AMWYJ1Z.skill-proof

Functionality:

->issueCredential(holder, skill, level, date) – Issuer adds a credential

->verifyCredential(credentialId) – Verifier checks if credential is valid

->getHolderCredentials(holder) – Fetch all credentials for a holder


Demo Video:
https://drive.google.com/file/d/15QoZE7GjaD6F08AEHQHFFKuq1lQXSVj_/view?usp=drivesdk
