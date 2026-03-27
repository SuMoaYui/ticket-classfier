// Domain Model for Ticket
export interface TicketProps {
  id: string;
  subject: string;
  body: string;
  customer_email: string;
  urgency: string;
  sentiment: string;
  department: string;
  status: string;
  confidence: number;
  reasoning: string;
  llm_raw_response: string;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Domain-Driven Design: Rich Model for Ticket
 * Encapsulates state and defines clear boundaries for state transitions.
 */
export class Ticket {
  private _id: string;
  private _subject: string;
  private _body: string;
  private _customer_email: string;
  private _urgency: string;
  private _sentiment: string;
  private _department: string;
  private _status: string;
  private _confidence: number;
  private _reasoning: string;
  private _llm_raw_response: string;
  private _metadata: Record<string, unknown>;
  private _created_at: string;
  private _updated_at: string;

  constructor(props: TicketProps) {
    this._id = props.id;
    this._subject = props.subject;
    this._body = props.body;
    this._customer_email = props.customer_email;
    this._urgency = props.urgency;
    this._sentiment = props.sentiment;
    this._department = props.department;
    this._status = props.status;
    this._confidence = props.confidence;
    this._reasoning = props.reasoning || '';
    this._llm_raw_response = props.llm_raw_response || '';
    this._metadata = props.metadata || {};
    this._created_at = props.created_at || new Date().toISOString();
    this._updated_at = props.updated_at || new Date().toISOString();
  }

  // Pure Getters
  get id() { return this._id; }
  get subject() { return this._subject; }
  get body() { return this._body; }
  get customer_email() { return this._customer_email; }
  get urgency() { return this._urgency; }
  get sentiment() { return this._sentiment; }
  get department() { return this._department; }
  get status() { return this._status; }
  get confidence() { return this._confidence; }
  get reasoning() { return this._reasoning; }
  get llm_raw_response() { return this._llm_raw_response; }
  get metadata() { return this._metadata; }
  get created_at() { return this._created_at; }
  get updated_at() { return this._updated_at; }

  /**
   * Business Logic: Update classification details from AI
   */
  public updateClassification(
    urgency: string,
    sentiment: string,
    department: string,
    confidence: number,
    reasoning: string,
    llmRawResponse: string
  ): void {
    if (this._status === 'closed') {
      throw new Error('Cannot update classification on a closed ticket.');
    }

    this._urgency = urgency;
    this._sentiment = sentiment;
    this._department = department;
    this._confidence = confidence;
    this._reasoning = reasoning;
    this._llm_raw_response = llmRawResponse;

    if (this._status === 'pending') {
      this._status = 'open';
    }
    this._updated_at = new Date().toISOString();
  }

  /**
   * Business Logic: Approve an escalation request
   */
  public approveEscalation(reason: string): void {
    if (this._status === 'closed') {
      throw new Error("Cannot escalate a closed ticket");
    }
    
    this._status = 'escalated';
    this._metadata = {
      ...this._metadata,
      escalationReason: reason,
      escalatedAt: new Date().toISOString()
    };
    this._updated_at = new Date().toISOString();
  }

  /**
   * Business Logic: Resolve ticket
   */
  public resolve(resolutionMessage: string): void {
    if (this._status === 'closed') {
      throw new Error("Ticket is already closed");
    }
    this._status = 'resolved';
    this._metadata = {
      ...this._metadata,
      resolutionMessage,
      resolvedAt: new Date().toISOString()
    };
    this._updated_at = new Date().toISOString();
  }

  /**
   * Convert for persistence layer
   */
  public toJSON(): TicketProps {
    return {
      id: this._id,
      subject: this._subject,
      body: this._body,
      customer_email: this._customer_email,
      urgency: this._urgency,
      sentiment: this._sentiment,
      department: this._department,
      status: this._status,
      confidence: this._confidence,
      reasoning: this._reasoning,
      llm_raw_response: this._llm_raw_response,
      metadata: this._metadata,
      created_at: this._created_at,
      updated_at: this._updated_at,
    };
  }
}
