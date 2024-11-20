import { v4 as uuidv4 } from "uuid";
import {
  query,
  update,
  text,
  nat64,
  Record,
  StableBTreeMap,
  Vec,
  Variant,
  Principal,
  Result,
  None,
  ic,
  Some,
  Ok,
  bool,
  Err,
  Canister,
} from "azle";

// Data Structures

const Researcher = Record({
  id: text,
  name: text,
  address: text,
  email: text,
  phone: text,
  owner: Principal,
  reputation_score: nat64,
  total_points: nat64,
  badges: Vec(text),
  contributions: Vec(text), // IDs of contributions
  achievements: Vec(text),
});

// Research Proposal
const ResearchProposal = Record({
  id: text,
  researcherId: text,
  title: text,
  description: text,
  methodology: text,
  milestones: Vec(text), // IDs of milestones
  funding_target: nat64,
  current_funding: nat64,
  stage: text, // "draft", "funding", "in-progress", "completed"
  reviews: Vec(text), // IDs of reviews
  timeline: text, // JSON-encoded timeline data
});

const Milestone = Record({
  id: text,
  description: text,
  required_funding: nat64,
  deadline: text,
  status: text, // "pending", "completed"
  proofs: Vec(text), // IDs of proofs
});

const Review = Record({
  id: text,
  reviewer: Principal,
  score: nat64,
  comments: text,
  stake_amount: nat64,
  verified: bool,
});

const ProofOfReproduction = Record({
  id: text,
  methodology_hash: text,
  results_hash: text,
  status: text, // "pending", "verified"
});

const Message = Variant({
  Success: text,
  Error: text,
  NotFound: text,
  InvalidPayload: text,
});

// Payload Structures

// Researcher Payload
const researcherPayload = Record({
  name: text,
  address: text,
  email: text,
  phone: text,
});

const CreateProposalPayload = Record({
  researcherId: text,
  title: text,
  description: text,
  methodology: text,
  funding_target: nat64,
});

const SubmitReviewPayload = Record({
  proposal_id: text,
  score: nat64,
  comments: text,
  stake_amount: nat64,
});

const FundProposalPayload = Record({
  proposal_id: text,
  funding_amount: nat64,
});

const CreateMilestonePayload = Record({
  proposal_id: text,
  description: text,
  required_funding: nat64,
  deadline: text,
});

const VerifyMilestonePayload = Record({
  proposal_id: text,
  milestone_id: text,
});

const SubmitProofPayload = Record({
  milestone_id: text,
  methodology_hash: text,
  results_hash: text,
});

// Storage Maps
const researchers = StableBTreeMap(0, text, Researcher);
const proposals = StableBTreeMap(1, text, ResearchProposal);
const milestones = StableBTreeMap(2, text, Milestone);
const reviews = StableBTreeMap(3, text, Review);
const proofs = StableBTreeMap(4, text, ProofOfReproduction);

// Core Functions

export default Canister({
  // Create Researcher
  createResearcher: update(
    [researcherPayload],
    Result(Researcher, Message),
    (payload) => {
      const { name, address, email, phone } = payload;

      // Comprehensive input validations
      if (!name || name.trim().length < 2) {
        return Err({
          InvalidPayload: "Name must be at least 2 characters long.",
        });
      }

      if (!address || address.trim().length < 5) {
        return Err({
          InvalidPayload: "Address must be at least 5 characters long.",
        });
      }

      // Basic email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return Err({ InvalidPayload: "Invalid email format." });
      }

      // Phone validation (example: simple length check, can be customized)
      const phoneRegex = /^[0-9]{10,15}$/;
      if (!phone || !phoneRegex.test(phone)) {
        return Err({ InvalidPayload: "Phone number must be 10-15 digits." });
      }

      // Check if researcher already exists (optional)
      const existingResearchers = researchers.values();
      const duplicateResearcher = existingResearchers.find(
        (r) => r.email === email || r.phone === phone
      );

      if (duplicateResearcher) {
        return Err({
          InvalidPayload: "Researcher with this email or phone already exists.",
        });
      }

      const id = uuidv4();
      const researcher = {
        id,
        name: name.trim(),
        address: address.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.replace(/\D/g, ""), // Remove non-digit characters
        owner: ic.caller(),
        reputation_score: 0n,
        total_points: 0n,
        badges: [],
        contributions: [],
        achievements: [],
      };

      try {
        researchers.insert(id, researcher);
        return Ok(researcher);
      } catch (error) {
        return Err({
          Error: `Failed to create researcher: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }
  ),

  // Function to get researcher by ID
  getResearcherById: query(
    [text], // researcher_id
    Result(Researcher, Message),
    (researcherId) => {
      const researcherOpt = researchers.get(researcherId);

      if ("None" in researcherOpt) {
        return Err({
          NotFound: `Researcher with id=${researcherId} not found.`,
        });
      }

      return Ok(researcherOpt.Some);
    }
  ),

  // Function to get all researchers
  getAllResearchers: query([], Result(Vec(Researcher), Message), () => {
    const allResearchers = researchers.values();

    if (allResearchers.length === 0) {
      return Err({ NotFound: "No researchers found." });
    }

    return Ok(allResearchers);
  }),

  // Function to get researcher by owner using filter
  getResearcherByOwner: query([], Result(Researcher, Message), () => {
    const researcherOpt = researchers.values().filter((researcher) => {
      return (
        researcher.owner.toText() === ic.caller().toText // Filter by owner
      );
    });

    if (researcherOpt.length === 0) {
      return Err({
        NotFound: `Researcher with owner=${ic.caller()} not found.`,
      });
    }

    return Ok(researcherOpt[0]);
  }),

  // Create Proposal
  createProposal: update(
    [CreateProposalPayload],
    Result(ResearchProposal, Message),
    (payload) => {
      const { researcherId, title, description, methodology, funding_target } =
        payload;

      if (!title || !description || !methodology || funding_target <= 0n) {
        return Err({
          InvalidPayload:
            "All fields are required, and funding target must be > 0.",
        });
      }

      // Check if researcher exists
      const researcherOpt = researchers.get(researcherId);

      if ("None" in researcherOpt) {
        return Err({
          NotFound: `Researcher with id=${researcherId} not found.`,
        });
      }

      const id = uuidv4();
      const proposal = {
        id,
        researcherId,
        title,
        description,
        methodology,
        milestones: [],
        funding_target,
        current_funding: 0n,
        stage: "draft",
        reviews: [],
        timeline: JSON.stringify({ created_at: new Date().toISOString() }),
      };

      proposals.insert(id, proposal);
      return Ok(proposal);
    }
  ),

  // Get Proposal by ID
  getProposalById: query(
    [text], // proposal_id
    Result(ResearchProposal, Message),
    (proposalId) => {
      const proposalOpt = proposals.get(proposalId);

      if ("None" in proposalOpt) {
        return Err({ NotFound: `Proposal with id=${proposalId} not found.` });
      }

      return Ok(proposalOpt.Some);
    }
  ),

  // Get All proposals
  getAllproposals: query([], Result(Vec(ResearchProposal), Message), () => {
    const allproposals = proposals.values();

    if (allproposals.length === 0) {
      return Err({ NotFound: "No proposals found." });
    }

    return Ok(allproposals);
  }),

  // Get Proposals by Researcher ID
  getProposalsByResearcherId: query(
    [text], // researcher_id
    Result(Vec(ResearchProposal), Message),
    (researcherId) => {
      const proposalsByResearcher = proposals
        .values()
        .filter((proposal) => proposal.researcherId === researcherId);

      if (proposalsByResearcher.length === 0) {
        return Err({
          NotFound: `No proposals found for researcher with id=${researcherId}.`,
        });
      }

      return Ok(proposalsByResearcher);
    }
  ),

  // Submit Review
  submitReview: update(
    [SubmitReviewPayload],
    Result(Review, Message),
    (payload) => {
      const { proposal_id, score, comments, stake_amount } = payload;

      const proposalOpt = proposals.get(proposal_id);

      if ("None" in proposalOpt) {
        return Err({ NotFound: `Proposal with id=${proposal_id} not found.` });
      }

      if (score < 1n || score > 10n || stake_amount < 100n) {
        return Err({
          InvalidPayload: "Invalid score or insufficient stake amount.",
        });
      }

      const reviewId = uuidv4();
      const review = {
        id: reviewId,
        reviewer: ic.caller(),
        score,
        comments,
        stake_amount,
        verified: false,
      };

      reviews.insert(reviewId, review);

      const proposal = proposalOpt.Some;
      proposal.reviews.push(reviewId);
      proposals.insert(proposal_id, proposal);

      return Ok(review);
    }
  ),

  // Fund Proposal
  fundProposal: update(
    [FundProposalPayload],
    Result(ResearchProposal, Message),
    (payload) => {
      const { proposal_id, funding_amount } = payload;

      const proposalOpt = proposals.get(proposal_id);

      if ("None" in proposalOpt) {
        return Err({ NotFound: `Proposal with id=${proposal_id} not found.` });
      }

      const proposal = proposalOpt.Some;

      if (funding_amount < 100n) {
        return Err({ InvalidPayload: "Minimum funding amount is 100 units." });
      }

      proposal.current_funding += funding_amount;

      if (proposal.current_funding >= proposal.funding_target) {
        proposal.stage = "funding";
      }

      proposals.insert(proposal_id, proposal);
      return Ok(proposal);
    }
  ),

  // Create Milestone
  createMilestone: update(
    [CreateMilestonePayload],
    Result(Milestone, Message),
    (payload) => {
      const { proposal_id, description, required_funding, deadline } = payload;

      const proposalOpt = proposals.get(proposal_id);

      if ("None" in proposalOpt) {
        return Err({ NotFound: `Proposal with id=${proposal_id} not found.` });
      }

      const milestoneId = uuidv4();
      const milestone = {
        id: milestoneId,
        description,
        required_funding,
        deadline,
        status: "pending",
        proofs: [],
      };

      milestones.insert(milestoneId, milestone);

      const proposal = proposalOpt.Some;
      proposal.milestones.push(milestoneId);
      proposals.insert(proposal_id, proposal);

      return Ok(milestone);
    }
  ),

  // Verify Milestone
  verifyMilestone: update(
    [VerifyMilestonePayload],
    Result(Milestone, Message),
    (payload) => {
      const { proposal_id, milestone_id } = payload;

      const proposalOpt = proposals.get(proposal_id);
      const milestoneOpt = milestones.get(milestone_id);

      if ("None" in proposalOpt || "None" in milestoneOpt) {
        return Err({ NotFound: "Proposal or Milestone not found." });
      }

      const milestone = milestoneOpt.Some;

      if (milestone.status !== "pending") {
        return Err({ InvalidPayload: "Milestone is not in a pending state." });
      }

      milestone.status = "completed";
      milestones.insert(milestone_id, milestone);

      return Ok(milestone);
    }
  ),

  // Submit Proof of Reproduction
  submitProof: update(
    [SubmitProofPayload],
    Result(ProofOfReproduction, Message),
    (payload) => {
      const { milestone_id, methodology_hash, results_hash } = payload;

      const milestoneOpt = milestones.get(milestone_id);

      if ("None" in milestoneOpt) {
        return Err({
          NotFound: `Milestone with id=${milestone_id} not found.`,
        });
      }

      const proofId = uuidv4();
      const proof = {
        id: proofId,
        methodology_hash,
        results_hash,
        status: "pending",
      };

      proofs.insert(proofId, proof);

      const milestone = milestoneOpt.Some;
      milestone.proofs.push(proofId);
      milestones.insert(milestone_id, milestone);

      return Ok(proof);
    }
  ),
});
