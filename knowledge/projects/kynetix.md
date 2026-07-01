# Kynetix — AI Gym Trainer & Nutrition Coach

Kynetix is a full-stack AI fitness and nutrition system that acts as a personal gym trainer
and nutrition coach. A FastAPI backend runs LangGraph streaming agents that are grounded by
RAG over a pgvector store, so the coaching stays accurate and personalized instead of
hallucinated. The system is paired with a React progressive web app (PWA) client, giving
users a responsive, app-like experience with real-time, streamed responses.

## How Kynetix works

The LangGraph agents orchestrate the conversation and tool use, retrieving relevant fitness
and nutrition context from a PostgreSQL + pgvector knowledge base before answering. Redis
supports fast state and caching, and the FastAPI backend streams tokens to the React PWA so
users see answers as they are generated. It is a clear demonstration of Sergio's end-to-end
approach: retrieval, agent orchestration, a production backend, and a polished frontend.

## Kynetix status and roadmap

Kynetix is currently a private repository and is about to enter a private beta-testing
phase. Planned future features include a React Native mobile app and a premium subscription
tier, among other improvements.

## Kynetix tech stack

LangGraph, LangChain, FastAPI, the OpenAI API, PostgreSQL with pgvector, Redis, and a React
progressive web app (PWA) front end.
