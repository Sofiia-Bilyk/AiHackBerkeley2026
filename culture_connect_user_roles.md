# Culture Connect User Roles and Permissions

This document defines the user-role model for **Culture Connect**, an AI cultural community and event operations platform.

The product should separate three concepts:

1. **Platform role**: what a person can do on Culture Connect overall.
2. **Community role**: what a person can do inside one specific community.
3. **Event role**: what a person can do for one specific event.

A user can have different roles in different communities and events. For example, the same person can be the **Community Owner** of Ukrainian Club, a **Community Member** in Georgian Community, and an **Outside Community Viewer** in Swedish Community.

Important model rule: **Event Organizer and Event Volunteer are event-bounded roles.** They apply to a specific event, not necessarily to the whole community. A community member who volunteers for an event becomes an **Event Volunteer** for that event duration only.

Important model rule: **Community Owner** means the person who created the community or owns the community space. Community Owner is different from Event Organizer. The owner controls the community. The event organizer runs a specific event.

Roles define what a person can do. Event access defines who can see or participate in a specific event. These should remain separate in the product and database model.

---

## Role Summary

| Role | Scope | Main Purpose |
|---|---|---|
| Guest / Not Registered User | Platform | Public visitor with no account |
| Registered User | Platform | Logged-in user who may not belong to any community yet |
| Outside Community Viewer | Community | Logged-in user viewing a community they do not belong to |
| Pending Member | Community | User waiting for approval to join a community |
| Community Member | Community | Accepted member of a specific community |
| Community Owner | Community | Person who created/owns the community |
| Event Organizer | Event | Person who started and manages a specific event |
| Event Volunteer | Event | Community member helping with a specific event for the event duration |
| Task Owner / Task Lead | Event/Task | Volunteer responsible for one specific task |
| Cross-Community Helper | Event/Task | Outside helper invited to support a specific event/task |
| Speaker / Cultural Contributor | Event | Person contributing performance, workshop, talk, or cultural knowledge |
| Sponsor / Local Business Contact | Event/Sponsor | Business or organization supporting the event |
| AI Agent / System Actor | System | Non-human system actor that drafts, suggests, tracks, and pokes |
| Platform Admin / Moderator | Platform | Platform-level safety and moderation role |

---

## 1. Guest / Not Registered User

A guest is someone who has not created an account or is not logged in.

Guests can view the landing page, understand what Culture Connect does, browse communities that are public, and see events marked **Public for web**. They can open public event pages, see basic event details, and use share links.

Guests cannot join a community, RSVP, comment, message members, volunteer for tasks, receive SMS pokes, view member lists, view private cultural calendars, or see private community content.

**Best use case:** someone finds a public Georgian Supra dinner or Ukrainian cultural event through a shared link or search.

### Permissions

Can:

- View the landing page
- View public community profiles
- View events marked **Public for web**
- See sponsor-approved public event details
- Open public event share links

Cannot:

- RSVP unless they register
- Join communities
- View private community content
- See member lists
- Volunteer for event tasks
- Receive SMS pokes
- Message community members

---

## 2. Registered User

A registered user has an account but may not belong to any community yet.

Registered users can browse public and logged-in-only events, search communities, request to join communities, create a basic profile, save events, RSVP to events that allow logged-in users, and start the process of creating a new community if their cultural group is missing.

They cannot view private community-only events unless accepted into that community. They cannot manage communities, approve private community content, or access organizer/event tools unless they have the relevant community or event role.

**Best use case:** a new user searches for “Ukrainian club near Bay Area,” finds a nearby community, and requests to join.

### Permissions

Can:

- Browse public logged-in events
- Request to join communities
- Create a new community, depending on product rules
- RSVP to events marked **Public logged members**
- Save events
- Receive general platform notifications
- Create a basic profile

Cannot:

- See private community content without membership
- Manage communities they do not own
- Approve generated holidays for a community they do not manage
- Publish events for a community unless they are the event organizer or community owner
- Assign tasks for an event they do not organize
- Send sponsor outreach as a community or event unless authorized

---

## 3. Outside Community Viewer

An outside community viewer is a logged-in user who is looking at a community where they are not a member.

Example: a Swedish community member views the Ukrainian community page.

They can view public information from other communities, such as public events, public cultural calendar items, public community descriptions, and public organizer-approved posts.

They cannot participate as a member in the other community unless invited or accepted. They cannot see private events, private members, internal tasks, SMS poke history, sponsor drafts, organizer notes, or private discussions.

**Best use case:** cross-cultural discovery without exposing private community operations.

### Permissions

Can:

- View public pages of other communities
- See events marked **Public for web**
- See events marked **Public logged members**, if allowed
- Request to join another community
- Offer help if the event allows outside helpers

Cannot:

- Access private member-only content
- Volunteer for private tasks unless invited
- See private member lists
- View organizer notes
- View internal sponsor drafts
- See SMS poke history

---

## 4. Pending Member

A pending member has requested to join a private or approval-based community but has not been accepted yet.

They can see limited information while waiting. This prevents private communities from exposing too much before approval.

**Best use case:** a person requests to join a private Armenian student community and waits for community owner approval.

### Permissions

Can:

- See request status
- Edit or cancel their join request
- View public community information
- Receive approval/rejection notification

Cannot:

- See private events
- See the private annual cultural calendar
- See the member list
- View task boards
- Message private community channels
- Receive community-only SMS pokes

---

## 5. Community Member

A community member has joined a specific community.

Community members can see that community’s private page, member-only events, approved cultural calendar, internal event details, messages, and volunteer opportunities. They can RSVP, volunteer for tasks, receive SMS pokes if they opt in, suggest events, and participate in community planning.

Community Member is the base role for participation inside a community. A member can become an **Event Volunteer** for a specific event when they choose to help. That volunteer status is temporary and event-bounded.

Community members should not automatically be able to approve holidays, publish public events, send sponsor emails, or change community access settings. Those permissions belong to the Community Owner or to the Event Organizer for the specific event.

**Best use case:** a Ukrainian community member signs up to help with food or setup for Ukrainian Independence Day Community Night.

### Permissions

Can:

- View private community content
- View the approved annual cultural calendar
- RSVP to community-only events
- Volunteer for open event tasks
- Receive SMS task pokes after opt-in
- Suggest events or edits
- Message within the community
- View event logistics for events they can access

Cannot:

- Change community ownership
- Change community visibility settings
- Remove members unless authorized by the community owner
- Publish public events unless they are the event organizer or community owner
- Approve AI-generated calendar items unless authorized
- Send sponsor outreach as the community unless authorized

---

## 6. Community Owner

A community owner is the person who created the community or owns the community space on Culture Connect.

The Community Owner controls the community-level settings. This is different from Event Organizer. The owner may organize events, but does not have to organize every event.

The owner can approve members, manage the community profile, set default privacy rules, approve or reject AI-generated calendar suggestions, and control who can start events in the community.

**Best use case:** the person who created Ukrainian Club owns the community and controls membership, privacy, and calendar approval rules.

### Permissions

Can:

- Edit community name, description, location, and visibility
- Approve or reject member requests
- Remove members when necessary
- Approve, reject, edit, or cherry-pick AI-generated holidays for the annual calendar
- Set the community’s approved cultural calendar
- Decide who can start events
- View all community events and event states
- Assign or remove event organizers if product rules allow it
- Approve public-facing community content
- Archive or delete the community, depending on product rules

Cannot:

- Override platform safety rules
- Access private content from other communities without permission
- Send SMS to members who did not opt in
- Auto-publish culturally sensitive AI output without review, if human approval is required by product policy

---

## 7. Event Organizer

An event organizer is the person who started a specific event or was assigned to manage that event.

Event Organizer is an event-level role. It does not automatically mean the person owns the whole community. In most cases, the Event Organizer should be a Community Member of the hosting community.

The event organizer controls the event workflow: generating the event plan, choosing event access, approving tasks, assigning volunteers, requesting cross-community help, approving sponsor outreach, and triggering SMS pokes for that event.

**Best use case:** a Ukrainian Club member starts Ukrainian Independence Day Community Night and becomes the Event Organizer for that event.

### Permissions

Can:

- Create an event from an approved cultural calendar item
- Generate an AI event plan
- Approve, reject, or edit the event plan
- Set event access level
- Create and edit event task lists
- Assign tasks to volunteers
- Invite members to volunteer
- Request cross-community help
- Approve sponsor outreach emails for that event
- Trigger or approve SMS pokes for event tasks
- Track event progress
- Close, cancel, or mark the event complete, depending on product rules

Cannot:

- Change whole-community ownership
- Remove community members unless also Community Owner or authorized
- Change private community settings unless authorized
- Access unrelated private events they do not organize
- Send sponsor emails or SMS pokes without required approval/opt-in rules

---

## 8. Event Volunteer

An event volunteer is a community member who chooses to help with a specific event.

This is a temporary, event-duration-bounded role. It starts when the member accepts a volunteer role or task, and it ends when the event is completed, canceled, or the person leaves the task.

An Event Volunteer may help generally or may become a **Task Owner / Task Lead** if assigned responsibility for a specific task.

**Best use case:** a Georgian Community member volunteers to help with setup for a Georgian Supra dinner. Their volunteer role applies only to that event.

### Permissions

Can:

- View event logistics needed for volunteers
- Join the event volunteer list
- Accept or decline assigned tasks
- Receive volunteer-related SMS pokes after opt-in
- Update their own volunteer availability
- Message the event organizer or volunteer group
- Mark their own help as complete, if applicable

Cannot:

- Edit the full event plan unless authorized
- Change event access level
- Approve sponsor outreach unless authorized
- Assign unrelated tasks unless made a task lead
- See private organizer notes unless shared
- Keep volunteer permissions after the event ends

---

## 9. Task Owner / Task Lead

A task owner is an Event Volunteer responsible for one specific event task.

Examples include food lead, venue lead, outreach lead, decorations lead, sponsor lead, check-in lead, and cleanup lead.

Task owners can update their task status, mark it done, mark it blocked, add notes, request help, and receive SMS pokes about that task. They should not automatically see private organizer notes or unrelated tasks unless the event organizer shares them.

**Best use case:** Maya is assigned “Food lead” for Ukrainian Cultural Night and receives SMS reminders.

### Permissions

Can:

- View assigned task
- Update task status: not started, in progress, blocked, done
- Add task notes
- Request help
- Receive task-specific SMS pokes after opt-in
- See task deadline and dependencies
- Message organizer or task group

Cannot:

- Change the full event plan
- Change event access level
- Assign unrelated tasks unless authorized
- Send public announcements unless authorized
- Send sponsor outreach unless assigned to sponsor task and approved

---

## 10. Cross-Community Helper

A cross-community helper is a person from another community who is invited to help with a specific event or task.

They are not a full member of the host community. They can see only the event or task information needed to help.

Example: Ukrainian Club asks Swedish Community members to help with setup, tables, or check-in. A Swedish member accepts as a helper for that event only.

This role requires an event access level like **Invite-only collaboration**.

### Permissions

Can:

- View invite-only collaboration event details
- Accept or decline helper invitation
- Volunteer for allowed tasks
- Receive task-specific SMS pokes after opt-in
- Message the event organizer or task group
- Update assigned task status

Cannot:

- See private community-only content
- See the full private member list unless explicitly allowed
- Access unrelated private events
- Change event access settings
- Act as a full community member without joining

---

## 11. Speaker / Cultural Contributor

A speaker or cultural contributor is someone invited to contribute performance, teaching, workshop content, a talk, music, food knowledge, cultural history, or other cultural expertise.

They may not be a community member, sponsor, or volunteer. They need limited access to event logistics related to their contribution.

**Best use case:** someone is invited to give a short talk about Ukrainian Independence Day history.

### Permissions

Can:

- View event logistics relevant to their contribution
- Confirm availability
- Upload or send bio, title, description, or materials if needed
- Message the event organizer
- Receive event-specific reminders if they opt in

Cannot:

- See private community discussions
- Manage event tasks unless separately assigned
- View private member data
- Send public event announcements unless authorized

---

## 12. Sponsor / Local Business Contact

A sponsor or local business contact is a restaurant, grocery store, print shop, cultural center, nonprofit, venue, vendor, or local business that may provide supplies, discounts, food, space, printing, equipment, or event sponsorship.

They are not a normal community member. They should only see sponsor-facing event information and the specific request.

**Best use case:** a local Eastern European grocery receives an outreach email asking whether it can sponsor snacks or offer a discount for Ukrainian Cultural Night.

### Permissions

Can:

- View sponsor-facing event page or supply request
- Respond to sponsorship request
- Offer donation, discount, venue, supplies, or decline
- Provide logo/contact info if approved
- See public event details relevant to sponsorship
- Message the event organizer through approved contact path

Cannot:

- See private member discussions
- See private member data
- Access the internal task board unless invited for a specific logistics task
- Message community members directly unless allowed
- Access private community-only content

---

## 13. AI Agent / System Actor

The AI Agent / System Actor is not a human user, but it should be modeled in permissions because Culture Connect uses agents that can draft, suggest, track, scrape, and poke.

AI agents should not have unlimited authority. They should generate drafts, suggestions, tasks, calendar items, outreach emails, and SMS poke drafts. Sensitive actions should require human approval.

### AI agents can:

- Scrape public sources through Browserbase
- Generate holiday suggestions
- Generate an annual cultural calendar draft
- Draft event plans
- Draft task lists
- Suggest task assignments
- Draft sponsor outreach emails
- Generate SMS poke messages
- Track task state in Redis
- Recommend follow-ups
- Retrieve community memory and event history from Redis

### AI agents should not automatically:

- Publish public events without approval
- Send sponsor emails without approval
- Add members without consent
- Send SMS without opt-in and approval rules
- Expose private community data to outsiders
- Create culturally sensitive public content without organizer or owner review
- Change community ownership or privacy settings

**Best use case:** the AI drafts a Ukrainian Independence Day event plan, but the Event Organizer or Community Owner approves it before it becomes public.

---

## 14. Platform Admin / Moderator

A platform admin or moderator handles platform-level safety, abuse, spam, fake communities, impersonation, harassment, unsafe events, and reported content.

Admins are not community owners. They manage Culture Connect as a platform. They should have limited, auditable access to private community content only when necessary for safety or moderation.

### Permissions

Can:

- Review reports
- Suspend public event visibility
- Remove spam or abusive content
- Disable fake communities
- Restrict accounts that violate platform rules
- Investigate safety issues
- Enforce platform-wide policies

Cannot:

- Casually access private community content without a moderation reason
- Take over a community for normal operations
- Change event content for stylistic reasons
- Use private member data outside moderation/safety needs

---

# Event Access Levels

Event access is separate from user role. The event organizer or community owner chooses who can see and participate in each event.

## 1. Public for Web

Visible to anyone, including guests and search/share links.

Best for public cultural festivals, open community events, public sponsor-supported events, and events meant to attract new people.

## 2. Public Logged Members on Website

Visible to logged-in Culture Connect users.

Best for events where the community wants some account barrier but does not require membership in the host community.

## 3. Private Inside Community Only

Visible only to members of the hosting community.

Best for small gatherings, internal planning meetings, private cultural nights, or sensitive community events.

## 4. Invite-Only Collaboration

Visible only to selected people outside the community, such as cross-community helpers, speakers, sponsors, venue contacts, or specific invited volunteers.

Best for event support without exposing the whole private community.

---

# Recommended MVP Roles for the Hackathon

For the hackathon demo, build only the roles needed to show the core workflow clearly:

1. Guest
2. Registered User
3. Community Member
4. Community Owner
5. Event Organizer
6. Event Volunteer
7. Task Owner / Task Lead
8. Cross-Community Helper
9. Sponsor / Local Business Contact
10. AI Agent / System Actor

This is enough to show community creation, approved cultural calendars, event generation, volunteer coordination, sponsor outreach, Redis task tracking, and SMS pokes without overbuilding the permission system.
