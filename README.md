# Decentralized Research Platform

A blockchain-based platform for managing research proposals, funding, and verification built on the Internet Computer Protocol (ICP). This system enables transparent research funding, peer review processes, and verification of research milestones.

## Features

- 🔬 **Researcher Management**
  - Create and manage researcher profiles
  - Track reputation scores and achievements
  - Maintain research contributions

- 📝 **Research Proposals**
  - Submit detailed research proposals
  - Define methodology and milestones
  - Set funding targets
  - Track proposal stages

- 💰 **Funding Management**
  - Transparent funding process
  - Track funding progress
  - Milestone-based fund release

- ✅ **Verification System**
  - Peer review submission
  - Stake-based review system
  - Proof of reproduction
  - Milestone verification

## Data Structures

### Researcher
```typescript
{
  id: text,
  name: text,
  address: text,
  email: text,
  phone: text,
  owner: Principal,
  reputation_score: nat64,
  total_points: nat64,
  badges: Vec(text),
  contributions: Vec(text),
  achievements: Vec(text)
}
```

### Research Proposal
```typescript
{
  id: text,
  researcherId: text,
  title: text,
  description: text,
  methodology: text,
  milestones: Vec(text),
  funding_target: nat64,
  current_funding: nat64,
  stage: text, // "draft", "funding", "in-progress", "completed"
  reviews: Vec(text),
  timeline: text
}
```

## API Reference

### Researcher Management

#### Create Researcher
```typescript
createResearcher: (payload: {
  name: text,
  address: text,
  email: text,
  phone: text
}) => Result<Researcher, Message>
```

#### Get Researcher
```typescript
getResearcherById: (researcherId: text) => Result<Researcher, Message>
getAllResearchers: () => Result<Vec<Researcher>, Message>
getResearcherByOwner: () => Result<Researcher, Message>
```

### Proposal Management

#### Create Proposal
```typescript
createProposal: (payload: {
  researcherId: text,
  title: text,
  description: text,
  methodology: text,
  funding_target: nat64
}) => Result<ResearchProposal, Message>
```

#### Get Proposals
```typescript
getProposalById: (proposalId: text) => Result<ResearchProposal, Message>
getAllproposals: () => Result<Vec<ResearchProposal>, Message>
getProposalsByResearcherId: (researcherId: text) => Result<Vec<ResearchProposal>, Message>
```

### Review and Funding

#### Submit Review
```typescript
submitReview: (payload: {
  proposal_id: text,
  score: nat64,
  comments: text,
  stake_amount: nat64
}) => Result<Review, Message>
```

#### Fund Proposal
```typescript
fundProposal: (payload: {
  proposal_id: text,
  funding_amount: nat64
}) => Result<ResearchProposal, Message>
```

### Milestone Management

#### Create and Verify Milestones
```typescript
createMilestone: (payload: {
  proposal_id: text,
  description: text,
  required_funding: nat64,
  deadline: text
}) => Result<Milestone, Message>

verifyMilestone: (payload: {
  proposal_id: text,
  milestone_id: text
}) => Result<Milestone, Message>
```

#### Submit Proof
```typescript
submitProof: (payload: {
  milestone_id: text,
  methodology_hash: text,
  results_hash: text
}) => Result<ProofOfReproduction, Message>
```
### Prerequisites

requirements:

- **dfx**: You have installed the latest version of the DFINITY Canister SDK, `dfx`. You can download it from the DFINITY SDK page. [installation guide](https://demergent-labs.github.io/azle/get_started.html#installation)

 ```
  use version dfx 0.22.0
 ```
- **Node.js**: You have installed Node.js, version 18 or above.
```
 v20.12.2

```
- Azle version use 
 ```
  azle 0.24.1
 ```

 - podman verion use

 ```
  podman version 3.4.4
  
 ```
 
## Installation

1. Clone the repository
```bash
git clone https://github.com/okirimoses/research-chain.git
cd research-chain
```

2. Install dependencies
```bash
npm install
```

4. Start the Ic local Replica
```bash
dfx start --clean --background
```

4. Deploy the canister
```bash
dfx deploy
```

## Usage Example

```typescript
// Create a researcher
const researcher = await createResearcher({
  name: "Dr. Jane Smith",
  address: "123 Research Ave",
  email: "jane.smith@research.org",
  phone: "1234567890"
});

// Create a research proposal
const proposal = await createProposal({
  researcherId: researcher.id,
  title: "Novel Approach to Quantum Computing",
  description: "Research into quantum error correction...",
  methodology: "Using topological quantum codes...",
  funding_target: 1000000n
});

// Submit a review
const review = await submitReview({
  proposal_id: proposal.id,
  score: 9n,
  comments: "Innovative approach with clear methodology",
  stake_amount: 1000n
});
```

## Security Considerations

- All input data is validated before processing
- Stake-based review system helps prevent spam
- Principal-based ownership verification
- Milestone verification requires proof submission
- Multi-stage funding release based on milestone completion

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

