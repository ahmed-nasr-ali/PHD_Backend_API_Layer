/**
 * The kinds of files the app keeps (one per folder in the CRM screen General Setting → SharePoint Config. → Routing Config).
 * It says what a file is, not where it is kept: every store maps each category to its own place.
 */
export enum FileCategory {
  User = 'user',
  Unit = 'unit',
  Vehicle = 'vehicle',
  GatePass = 'gate-pass',
  SalesLaunchContent = 'sales-launch-content',
  Invitation = 'invitation',
  Privacy = 'privacy',
  SendUsMessage = 'send-us-message',
  CommercialEntity = 'commercial-entity',
  Compound = 'compound',
}
