I would actually tell Figma Make to modify the existing design, not recreate it. Also be very explicit that this is an information architecture exercise, not a visual redesign.
Figma Make Prompt
Revamp this Product Engineering module to reflect a role-native experience rather than a generic project management tool.
Do not redesign the visual language. Keep the existing DXOne-inspired layout (Left Navigation + Main Workspace + Persistent AI Panel). Focus only on restructuring the information architecture and navigation.
Core Philosophy
This is not another Jira or Linear.
The application is divided into four independent Spaces. Each Space represents a different login and user persona. Each Space should feel like its own product, optimized for how that role works.
The four spaces are:
Leadership Space
Product Manager (PM) Space
Engineering Space
QA Space
All four spaces work on the same underlying data and objects, but expose different navigation, responsibilities and dashboards.
The PM Space acts as the administrator and orchestrator of delivery.
Shared Layout
Keep the three-panel layout.
Left Sidebar
Role-specific navigation.
Each Space should have a different sidebar.
Center
Role-specific workspace.
Right Panel
Persistent DXOne AI Assistant.
Suggested AI actions should change depending on the Space.
Leadership Space
Purpose:
Leadership defines business outcomes and monitors delivery.
They should never manage stories or tasks.
Sidebar
Dashboard
Initiatives
Initiative List
Initiative Detail
Planning
Timeline / Calendar
Reports
Dashboard
Display:
Initiative Health
Delivery Confidence
Upcoming Milestones
At Risk Initiatives
AI Executive Summary
Initiative Detail
Leadership creates initiatives with only:
Title
Target Date
Everything else is optional and can be added later.
Show:
Business Goal
Progress
Contributors
Timeline
Risks
AI Summary
No backlog.
No sprint.
No task boards.
Product Manager Space
Purpose:
PM is the administrator of Product Engineering.
PM owns planning and orchestration.
PM has visibility across every layer of delivery.
Sidebar
Dashboard
Initiatives
Initiative List
Initiative Detail
Backlog
Releases
Planning
Reports
Dashboard
Display:
My Initiatives
Delivery Health
Upcoming Releases
Engineering Progress
QA Progress
AI Recommendations
Initiative Detail
Show:
Business Goal
Features
Stories
Contributors
Engineering Lead
Dependencies
Release Plan
Timeline
Activity Feed
PM should be able to:
Create initiatives
Create features
Create stories
Assign Engineering Leads
Assign QA
Plan releases
PM should also be able to view:
Engineering tasks
QA tasks
Bugs
Sprint progress
Comments
Discussions
PM can comment anywhere.
PM is the orchestration layer between Leadership, Engineering and QA.
Engineering Space
Purpose:
Engineering focuses on execution.
Initiatives are context, not navigation.
Sidebar
Dashboard
Sprint
My Tasks
Board
Releases
Dashboard
Display:
Assigned Work
Sprint Progress
Blockers
Code Reviews
Build Status
Recent Deployments
My Tasks
Show:
Assigned
In Progress
Review
Blocked
Completed
Each task should display linked metadata:
Initiative
Feature
Story
Engineering should be able to:
Create tasks
Create subtasks
Estimate work
Update status
Comment
Mention PM or QA
Engineering should not manage initiatives.
QA Space
Purpose:
QA owns validation and release readiness.
Sidebar
Dashboard
Sprint
Testing Queue
Bugs
Release Readiness
Dashboard
Display:
Ready for Testing
Failed Tests
Critical Bugs
Regression Status
Release Health
Testing Queue
Show:
Ready
In Testing
Failed
Approved
Every testing item should display:
Initiative
Feature
Story
QA should be able to:
Create bugs
Create test cases
Approve builds
Reject builds
Mention PM or Engineering
Comment directly on stories
QA should not manage initiatives.
Shared Collaboration Model
All spaces work on the same underlying objects.
Visibility is broader than ownership.
PM has visibility into all work across Engineering and QA.
Engineering and QA can mention PM inside comments.
Everyone collaborates on the same stories, tasks and bugs.
No duplicate objects should exist.
AI Panel
Persistent DXOne AI Assistant.
Suggested prompts should adapt per Space.
Leadership
Create Initiative
Summarize Portfolio
Predict Delivery Risks
PM
Break initiative into features
Generate stories
Prioritize backlog
Plan release
Engineering
Generate implementation plan
Break into subtasks
Explain requirement
Review implementation
QA
Generate test cases
Create regression suite
Analyze bugs
Check release readiness
Design Principles
Low fidelity wireframes only
Enterprise SaaS style
Focus on information hierarchy
Avoid Jira-style issue lists as the default experience
Every Space should feel like a different application built for that role
Progressive disclosure: users should only see complexity relevant to their role
Outcome-first rather than task-first
The PM Space should feel like the central orchestration hub connecting Leadership, Engineering and QA
Engineering and QA should see initiatives only as contextual metadata, not as primary navigation