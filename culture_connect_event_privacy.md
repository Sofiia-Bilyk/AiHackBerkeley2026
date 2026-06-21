# Culture Connect Event Privacy and Visibility Model

## Core Privacy Principle

Culture Connect communities are private by default.

Users cannot make an entire community public. Public discovery happens only through approved public events, not through public access to the full community space.

A community may appear as a limited preview tile, but the tile exposes only minimal information. The full community page, member list, internal calendar, task board, sponsor drafts, SMS poke history, and organizer notes remain private.

## Community Visibility

### Private Community

Every community is private by default.

Only approved community members can access the full community space.

Approved community members may see:

- Full community page
- Private community description
- Approved member-only cultural calendar
- Private events
- Internal posts and messages
- Community discussion
- Volunteer opportunities
- Event task boards, if permitted
- Member-only event logistics

Only the appropriate owner, event organizer, or authorized event volunteers may see:

- AI-generated drafts before approval
- Holiday approval/rejection history
- Sponsor outreach drafts
- Internal organizer notes
- SMS poke history
- Task assignment controls
- Cross-community help requests
- Member preference data
- Redis-stored community memory exposed through the UI

Users cannot change the full community itself to public.

## Public Community Tile

A community tile may appear on discovery surfaces, but it is not a public community page.

The tile exists only to help users discover that a community exists and request access.

### Visible on Community Tiles

- Community name
- Culture, country, or ethnic group label, if approved
- General location, if enabled, such as "Bay Area" instead of exact address
- Latest scheduled public event name
- Latest scheduled public event date
- Request to join button

### Not Visible on Community Tiles

- Member list
- Private events
- Private event location
- Internal cultural calendar
- Community messages
- Organizer notes
- Volunteer tasks
- Sponsor requests
- Sponsor outreach drafts
- SMS poke activity
- AI memory or internal context
- Private photos or files
- Personal member data

### Example Tile With Public Event

**Ukrainian Club — Bay Area**  
Latest public event: Ukrainian Independence Day Cultural Night  
Date: August 24  
Button: Request to join

### Example Tile Without Public Event

**Ukrainian Club — Bay Area**  
No public events listed  
Button: Request to join

## Global Public Events Page

The Global Public Events Page is the only public event discovery area across all communities.

It shows only events that the event organizer explicitly marks as **Public for Web**.

A public event does not make the host community public. It only makes that specific event page visible.

### Visible on the Global Public Events Page

- Event title
- Event date and time
- Host community name
- Public event description
- Public event image, if approved
- Public location or general location
- Approved public sponsor names, if any
- RSVP or join prompt, depending on event settings
- Share link

### Not Visible on the Global Public Events Page

- Full community page
- Member list
- Private community calendar
- Internal task board
- Organizer-only notes
- Sponsor draft emails
- SMS poke history
- Private volunteer assignments
- Private community discussion
- AI-generated drafts before approval

## Event Access Levels

Event access controls who can view or interact with a specific event.

Event access does not change the privacy of the host community.

Culture Connect supports three main event access levels:

1. Public for Web
2. Public to Logged-In Website Members
3. Private Inside Community Only

## 1. Public for Web

### Meaning

The event page is visible to anyone on the internet, including guests who are not registered or logged in.

The event may appear on the Global Public Events Page.

This does not make the full community public.

### Best For

- Open cultural events
- Public holiday events
- Cultural festivals
- Sponsor-supported events
- Public performances
- Public education events
- Fundraising events
- Events intended for broader outreach

### Who Can View

- Guest / not registered user
- Registered user
- Outside community viewer
- Community member
- Event volunteer
- Sponsor contact, if relevant
- Speaker or cultural contributor, if relevant
- Platform admin or moderator

### Public View May Include

- Event title
- Event date and time
- Public location or general location
- Public description
- Host community name
- Event image, if approved
- Approved sponsor names
- Public RSVP or registration prompt
- Share link

### Public View Must Not Include

- Member list
- Private community page
- Internal task board
- Volunteer assignments unless intentionally public
- Organizer-only planning notes
- Sponsor outreach drafts
- SMS poke history
- Private cultural calendar
- Private community discussion
- AI-generated drafts before approval

### Interaction Rule

Guests can view and share the event.

To RSVP, volunteer, message organizers, or join community-related activity, the user must follow the event rules. This may require registration, approval, or a specific invite.

## 2. Public to Logged-In Website Members

### Meaning

The event is visible only to registered Culture Connect users.

It is not visible to random internet visitors or guests.

It may appear on an internal app-wide event discovery page for logged-in users.

This does not make the full host community public.

### Best For

- Semi-public community events
- Inter-community events
- Platform-only cultural mixers
- Volunteer calls
- Events where organizers want a basic identity barrier
- Events that should be discoverable inside Culture Connect but not publicly indexed on the web

### Who Can View

- Registered user
- Outside community viewer
- Community member
- Event volunteer
- Cross-community helper, if invited or allowed
- Sponsor contact, if given access
- Speaker or cultural contributor, if invited
- Platform admin or moderator

### Who Cannot View

- Guest / not registered user

### Logged-In View May Include

- Event title
- Event date and time
- Host community name
- Event description
- Location, depending on organizer settings
- RSVP option, if enabled
- Request-to-help option, if enabled
- Request-to-join-community prompt, if enabled

### Logged-In View Must Not Include Unless Authorized

- Private task board
- Internal planning notes
- Full member list
- SMS poke history
- Organizer-only sponsor outreach drafts
- Private community chat
- Private cultural calendar

### Interaction Rule

Logged-in users may RSVP, request access, or request to help only if the event organizer allows it.

Viewing a logged-in public event does not make the user a member of the host community.

## 3. Private Inside Community Only

### Meaning

The event is visible only to approved members of the host community.

This is the default safest event access level for internal community events.

### Best For

- Member-only gatherings
- Small cultural dinners
- Planning meetings
- Internal volunteer coordination
- Family-sensitive events
- Children/family events
- Early-stage event planning
- Events with sensitive community context

### Who Can View

- Community owner
- Event organizer
- Approved community members
- Event volunteers who are members
- Platform admin or moderator only when required for safety/moderation

### Who Cannot View

- Guest / not registered user
- Registered user outside the community
- Outside community viewer
- Members of other communities
- Sponsors, unless separately invited to a sponsor-facing view
- Cross-community helpers, unless separately invited to a limited collaboration view

### Member View May Include

- Event title
- Event date and time
- Event location
- Event description
- Member RSVP
- Approved member-only logistics
- Internal comments or discussion
- Volunteer task options, depending on role

### Organizer-Only View May Include

- Draft event versions
- AI-generated event suggestions before approval
- Event approval history
- Sponsor outreach drafts
- Internal organizer notes
- Full task assignment controls
- SMS poke controls
- Private planning history

### Interaction Rule

Only approved community members can RSVP or volunteer for private community events.

Outside users must request to join the community or receive a specific invite through a separate collaboration path.

## Optional Future Access: Invite-Only Collaboration

The MVP can support only the three primary event access levels.

However, Culture Connect may later need a limited invite-only access mode for people who are not full community members but need access to one specific event role.

This is useful for:

- Cross-community helpers
- Sponsors
- Speakers
- Performers
- Venue contacts
- Local business partners
- Vendors

### Meaning

The main event may remain private, but selected outside people receive limited access to the specific information needed for their role.

### Examples

A Swedish community member helps with setup for a Ukrainian event.

A local grocery receives a sponsor request for food supplies.

A speaker receives event logistics for a cultural talk.

### Access Boundary

Invite-only collaborators should not see:

- Private community messages
- Full member list
- Unrelated event tasks
- Internal organizer notes
- Private cultural calendar
- Other private community events

## Access Matrix

| Page or Object | Guest | Registered User | Outside Community Viewer | Community Member | Event Organizer | Community Owner |
|---|---:|---:|---:|---:|---:|---:|
| Landing page | Yes | Yes | Yes | Yes | Yes | Yes |
| Limited community tile | Yes | Yes | Yes | Yes | Yes | Yes |
| Full community page | No | No | No | Yes | Yes | Yes |
| Public for Web event | Yes | Yes | Yes | Yes | Yes | Yes |
| Logged-In Public event | No | Yes | Yes | Yes | Yes | Yes |
| Private community event | No | No | No | Yes | Yes | Yes |
| Private community calendar | No | No | No | Yes | Yes | Yes |
| Member list | No | No | No | If allowed | Yes | Yes |
| Event task board | No | No | No | If allowed | Yes | Yes |
| Assigned volunteer task | No | No | No | If assigned | Yes | Yes |
| Sponsor outreach drafts | No | No | No | No | Yes | Yes |
| SMS poke history | No | No | No | No | Yes | Yes |
| AI-generated drafts before approval | No | No | No | No | Yes | Yes |
| Community settings | No | No | No | No | Limited | Yes |

## Product Rules

1. Communities are private by default.
2. Users cannot make an entire community public.
3. A public event does not make the host community public.
4. Community tiles show only minimal preview information.
5. Full community content is visible only to approved community members.
6. Public discovery happens through approved public events, not public community pages.
7. AI-generated drafts must not become public without human approval.
8. Sponsor outreach drafts are organizer-only until approved.
9. SMS poke history is private to event organizers and appropriate owners.
10. Outside users can view public events but cannot access private community operations.
