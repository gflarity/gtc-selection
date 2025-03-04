
// The participant interface from the EventFocus search APi
export interface Participant {
  lastName: string;
  session: any[]; // Replace 'any' with a more specific type if available
  companyName: string;
  jobTitle: string;
  roles: string;
  bio: string;
  speakerId: string;
  language: string;
  globalFullName: string;
  globalPhotoURL: string;
  photoURL: string;
  globalLastname: string;
  modified: string;
  globalFirstname: string;
  eventId: string;
  es_metadata_id: string;
  globalCompany: string;
  fullName: string;
  published: number;
  displayorder: number;
  testRecord: boolean;
  attributevalues: any[]; // Replace 'any' with a more specific type if available
  firstName: string;
  userRef: string;
  "Speaker-Photo-Published": string;
  globalBio: string;
  globalJobtitle: string;
}

// The RawSession interface from the EventFocus search API
// (items)l. THere's a lot mor ehere, but this is what we need.
export interface Session {
    sessionID: string;
    abstract: string;
    title: string;
    participants: Participant[];
}

