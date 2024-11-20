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

// New Reputation and Reward System
const Researcher = Record({
  principal: Principal,
  reputation_score: nat64,
  total_points: nat64,
  badges: Vec(text),
  contributions: Vec(text), // IDs of contributions
  achievements: Vec(text),
});

const ContributionType = Variant({
  Review: text,
  Funding: text,
  Milestone: text,
  Proof: text,
});

const Badge = Record({
  id: text,
  name: text,
  description: text,
  points_threshold: nat64,
});

// Existing Records (with minor modifications)
const ResearchProposal = Record({
  // ... existing fields
  contributors_points: Vec(Record({
    principal: Principal,
    points_earned: nat64,
  })),
});

const Review = Record({
  // ... existing fields
  points_earned: nat64,
});

// Storage Maps
const Researchers = StableBTreeMap(4, Principal, Researcher);
const Badges = StableBTreeMap(5, text, Badge);

// Point Calculation Constants
const POINTS = {
  REVIEW_BASE: 10n,
  REVIEW_QUALITY_MULTIPLIER: 2n,
  FUNDING_BASE: 1n, // 1 point per funding unit
  MILESTONE_COMPLETION: 50n,
  PROOF_VERIFICATION: 30n,
  PROPOSAL_CREATION: 20n,
};

// Predefined Badges
const DEFAULT_BADGES = [
  {
    id: "research_starter",
    name: "Research Starter",
    description: "Created first research proposal",
    points_threshold: 20n,
  },
  {
    id: "funding_champion",
    name: "Funding Champion",
    description: "Contributed significant funding to research",
    points_threshold: 500n,
  },
  {
    id: "review_master",
    name: "Review Master",
    description: "Provided high-quality reviews",
    points_threshold: 200n,
  },
];

export default Canister({
  // Initialize Badges on Canister Deployment
  init: update([], Result(Vec(Badge), Message), () => {
    DEFAULT_BADGES.forEach(badge => {
      Badges.insert(badge.id, badge);
    });
    return Ok(DEFAULT_BADGES);
  }),

  // Enhanced Proposal Creation with Point Tracking
  createProposal: update(
    [CreateProposalPayload],
    Result(ResearchProposal, Message),
    (payload) => {
      const { title, description, methodology, funding_target } = payload;

      if (!title || !description || !methodology || funding_target <= 0n) {
        return Err({ InvalidPayload: "All fields are required, and funding target must be > 0." });
      }

      const id = uuidv4();
      const caller = ic.caller();
      
      // Update or Create Researcher Profile
      const researcherOpt = Researchers.get(caller);
      const researcher = researcherOpt.Some || {
        principal: caller,
        reputation_score: 0n,
        total_points: 0n,
        badges: [],
        contributions: [],
        achievements: [],
      };

      // Add points for proposal creation
      researcher.total_points += POINTS.PROPOSAL_CREATION;
      researcher.contributions.push(id);

      // Check for Research Starter Badge
      if (!researcher.badges.includes("research_starter")) {
        researcher.badges.push("research_starter");
      }

      Researchers.insert(caller, researcher);

      const proposal = {
        ...{
          id,
          researcher: caller,
          title,
          description,
          methodology,
          milestones: [],
          funding_target,
          current_funding: 0n,
          stage: "draft",
          reviews: [],
          timeline: JSON.stringify({ created_at: new Date().toISOString() }),
          contributors_points: [],
        }
      };

      Proposals.insert(id, proposal);
      return Ok(proposal);
    }
  ),

  // Enhanced Review Submission with Quality Scoring
  submitReview: update(
    [SubmitReviewPayload],
    Result(Review, Message),
    (payload) => {
      const { proposal_id, score, comments, stake_amount } = payload;

      const proposalOpt = Proposals.get(proposal_id);
      const caller = ic.caller();

      if ("None" in proposalOpt) {
        return Err({ NotFound: `Proposal with id=${proposal_id} not found.` });
      }

      if (score < 1n || score > 10n || stake_amount < 100n) {
        return Err({ InvalidPayload: "Invalid score or insufficient stake amount." });
      }

      // Calculate points based on review quality
      const points_earned = POINTS.REVIEW_BASE * score * POINTS.REVIEW_QUALITY_MULTIPLIER;

      const reviewId = uuidv4();
      const review = {
        id: reviewId,
        reviewer: caller,
        score,
        comments,
        stake_amount,
        verified: false,
        points_earned,
      };

      Reviews.insert(reviewId, review);

      // Update Researcher Profile
      const researcherOpt = Researchers.get(caller);
      const researcher = researcherOpt.Some || {
        principal: caller,
        reputation_score: 0n,
        total_points: 0n,
        badges: [],
        contributions: [],
        achievements: [],
      };

      researcher.total_points += points_earned;
      researcher.contributions.push(reviewId);

      // Check for Review Master Badge
      const reviewMasterBadge = Badges.get("review_master").Some;
      if (reviewMasterBadge && researcher.total_points >= reviewMasterBadge.points_threshold) {
        if (!researcher.badges.includes("review_master")) {
          researcher.badges.push("review_master");
        }
      }

      Researchers.insert(caller, researcher);

      const proposal = proposalOpt.Some;
      proposal.reviews.push(reviewId);
      proposal.contributors_points.push({
        principal: caller,
        points_earned,
      });

      Proposals.insert(proposal_id, proposal);

      return Ok(review);
    }
  ),

  // Get Researcher Profile
  getResearcherProfile: query(
    [Principal],
    Result(Researcher, Message),
    (principal) => {
      const researcherOpt = Researchers.get(principal);

      if ("None" in researcherOpt) {
        return Err({ NotFound: "Researcher profile not found." });
      }

      return Ok(researcherOpt.Some);
    }
  ),

  // Leaderboard Function
  getResearcherLeaderboard: query(
    [],
    Result(Vec(Researcher), Message),
    () => {
      const allResearchers = Researchers.values();
      
      // Sort researchers by total points in descending order
      const sortedResearchers = allResearchers.sort((a, b) => 
        b.total_points - a.total_points
      );

      return Ok(sortedResearchers);
    }
  ),

  // Additional existing methods remain the same...
});