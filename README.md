# Pocket Pal

Build a simple personal finance tracking application for a single user.

The goal is to make personal expense tracking extremely easy. The application should have a clean, modern, minimal interface and should not feel like complicated accounting software.

Core concept

The user should be able to:

Quickly add today's transactions.

View all transactions.

Automatically categorize transactions.

View monthly spending analysis.

See charts for spending by category.

Receive AI-generated spending insights and suggestions.

Edit or correct transactions and categories.

Use the application on both mobile and desktop.

Main screens

1. Home / Dashboard

When the application opens, show a simple dashboard.

Display:

Today's total spending

This month's total spending

Number of transactions today

Current month

Quick "Add Transaction" button

Small category spending summary

Latest AI insight

Keep this screen visually simple.

Example:

Today's Spending
₹450

This Month
₹8,450

[ + Add Transaction ]

Food ₹2,300
Daily ₹1,850
Transport ₹1,200
Other ₹3,100

AI Insight:
"You spent more on food this week than your usual weekly average."

2. Add Transaction

Make adding a transaction extremely fast.

Fields:

Amount

Description

Date

Category

Optional notes

The user should primarily enter:

₹45
Milk

The application should then automatically suggest:

Category: Daily Needs

The user must be able to change the category manually.

Support transaction types:

Expense

Income

Default transaction type should be Expense.

3. Transaction List

Create a screen where the user can view all transactions.

Each transaction should display:

Date

Description

Amount

Category

Transaction type

Add:

Search

Date filtering

Category filtering

Edit transaction

Delete transaction

Group transactions by date when appropriate.

Example:

TODAY

Milk Daily Needs ₹45
Bus Transport ₹30
Lunch Food ₹120

YESTERDAY

Groceries Food ₹650

4. Monthly Analysis

Create a dedicated analytics screen.

Allow the user to select a month.

Display:

Total income

Total expenses

Net balance

Average daily spending

Highest spending category

Number of transactions

Charts should include:

Category spending pie/donut chart.

Daily spending line/bar chart.

Monthly comparison chart where useful.

Do not overload the screen with charts.

5. Categories

Create default categories:

Food

Daily Needs

Transport

Bills & Utilities

Shopping

Entertainment

Health

Education

Travel

Subscriptions

Other

Allow the user to create custom categories later.

6. AI Assistant

Include a lightweight text-based AI assistant.

The AI should help with:

Categorizing transactions

Identifying spending patterns

Providing spending summaries

Giving practical suggestions

Identifying unusual spending

Comparing current spending with previous periods

Answering questions about the user's own transaction data

The AI must never invent transaction data.

The AI should only use transaction information provided by the application's database.

Example:

User enters:

"Milk ₹45"

AI category suggestion:

"Daily Needs"

Another example:

"Uber ₹320"

AI category suggestion:

"Transport"

The user must always be able to override an AI-generated category.

AI insight behavior

The application may show small text-based AI messages such as:

"You have spent ₹2,450 on food this month."

"Your transport spending is 18% higher than last month."

"You made 7 entertainment purchases this month."

"Your average daily spending has increased this week."

Avoid unnecessary notifications.

AI suggestions should be factual, transparent, and non-judgmental.

Do not shame the user for spending money.

Do not make financial investment recommendations.

Data model

Create a transaction model containing at least:

id

amount

description

date

category

transaction_type

notes

created_at

updated_at

Use a proper persistent database rather than storing important data only in frontend state.

Important calculations

Calculate using application/database logic rather than AI:

Daily spending

Monthly spending

Category totals

Income

Expenses

Net balance

Average spending

Month-to-month changes

Transaction counts

The AI should receive these calculated values when generating insights.

Design requirements

Use a minimalist modern design.

Prioritize:

readability

large touch-friendly controls

fast transaction entry

minimal navigation

responsive design

mobile-first layout

Avoid:

excessive animations

complicated dashboards

unnecessary financial terminology

excessive colors

clutter

The application should feel like a simple personal expense notebook with useful analytics.

Responsive / application packaging

Build the frontend so it works well on:

mobile screens

tablets

laptop/desktop screens

Structure the project so it can later be packaged as:

Android APK

Desktop executable

Do not assume that a normal web application automatically becomes a native APK or EXE. Keep the architecture compatible with an appropriate packaging solution.

Security and privacy

This is a personal finance application.

Do not expose API keys in frontend code.

AI API calls must go through a secure backend/server-side function.

Do not send unnecessary personal information to the AI.

The user should be able to delete their transaction data.

Initial version / MVP

Keep the first version small.

The MVP should contain only:

Dashboard

Add transaction

Transaction history

Categories

Monthly analytics

Basic AI categorization

Basic AI spending insights

Do not add banking integration, stock trading, investment management, credit scores, cryptocurrency, or complex budgeting features in the first version.

Generate a clean working application with a clear component structure and a maintainable codebase.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c20a5f3f-9f1a-4b41-8cc3-a74c3091614c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
