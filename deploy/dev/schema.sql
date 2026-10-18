--
-- PostgreSQL database dump
--

\restrict zYZ87B9C2LAjfJe5EtKNi7s0lWFW65U3zlPxs9MMQEgY390wF492jObdSKsPsat

-- Dumped from database version 17.10 (Homebrew)
-- Dumped by pg_dump version 17.10 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    user_id text NOT NULL,
    scope text NOT NULL,
    chapter_index integer,
    duration text NOT NULL,
    amount integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    seen_by_author boolean DEFAULT false NOT NULL,
    expiry_notified boolean DEFAULT false NOT NULL,
    payment_order_id uuid,
    CONSTRAINT access_grants_duration_check CHECK ((duration = ANY (ARRAY['1h'::text, '1d'::text, '1w'::text, '1y'::text, 'always'::text]))),
    CONSTRAINT access_grants_scope_check CHECK ((scope = ANY (ARRAY['whole'::text, 'chapter'::text])))
);


--
-- Name: account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: attributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    related_story_id uuid NOT NULL,
    kind text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attributions_kind_check CHECK ((kind = ANY (ARRAY['inspired_by'::text, 'similar'::text])))
);


--
-- Name: auth_verification_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_verification_limits (
    key text NOT NULL,
    window_start timestamp with time zone DEFAULT now() NOT NULL,
    requests integer DEFAULT 0 NOT NULL,
    last_sent_at timestamp with time zone
);


--
-- Name: author_payment_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.author_payment_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    mode text NOT NULL,
    country text NOT NULL,
    provider_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT author_payment_accounts_country_check CHECK ((country ~ '^[A-Z]{2}$'::text)),
    CONSTRAINT author_payment_accounts_mode_check CHECK ((mode = ANY (ARRAY['test'::text, 'live'::text])))
);


--
-- Name: bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    story_id uuid NOT NULL,
    chapter_index integer NOT NULL,
    quote text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    occurrence integer DEFAULT 0 NOT NULL
);


--
-- Name: collection_stories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_stories (
    collection_id uuid NOT NULL,
    story_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follows (
    follower_id text NOT NULL,
    following_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT follows_check CHECK ((follower_id <> following_id))
);


--
-- Name: genres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.genres (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL
);


--
-- Name: genres_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.genres_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: genres_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.genres_id_seq OWNED BY public.genres.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    kind text NOT NULL,
    actor_id text,
    story_id uuid,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    seen boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_kind_check CHECK ((kind = ANY (ARRAY['purchase'::text, 'follow'::text, 'subscribe'::text, 'reaction'::text, 'sub_expiring'::text, 'new_chapter'::text, 'mention'::text, 'story_mention'::text, 'post_like'::text, 'post_comment'::text, 'review'::text, 'prompt_answer'::text, 'grant_expiring'::text])))
);


--
-- Name: payment_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    buyer_id text,
    author_id text,
    story_id uuid,
    request_key uuid NOT NULL,
    request_hash text NOT NULL,
    mode text NOT NULL,
    provider_account_id text NOT NULL,
    story_title text NOT NULL,
    currency text NOT NULL,
    amount_minor bigint NOT NULL,
    platform_fee_bps integer NOT NULL,
    items jsonb NOT NULL,
    status text DEFAULT 'created'::text NOT NULL,
    checkout_session_id text,
    payment_intent_id text,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_orders_amount_minor_check CHECK (((amount_minor > 0) AND (amount_minor <= '9007199254740991'::bigint))),
    CONSTRAINT payment_orders_currency_check CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT payment_orders_items_check CHECK ((jsonb_typeof(items) = 'array'::text)),
    CONSTRAINT payment_orders_mode_check CHECK ((mode = ANY (ARRAY['test'::text, 'live'::text]))),
    CONSTRAINT payment_orders_platform_fee_bps_check CHECK (((platform_fee_bps >= 0) AND (platform_fee_bps < 10000))),
    CONSTRAINT payment_orders_status_check CHECK ((status = ANY (ARRAY['created'::text, 'checkout_open'::text, 'paid'::text, 'expired'::text])))
);


--
-- Name: payment_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_webhook_events (
    mode text NOT NULL,
    event_id text NOT NULL,
    processed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: post_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    author_id text NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: post_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_likes (
    post_id uuid NOT NULL,
    user_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: post_mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_mentions (
    post_id uuid NOT NULL,
    user_id text NOT NULL
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id text NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    answer_story_id uuid,
    answer_chapter integer,
    answer_prompt text
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: question_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    chapter_index integer NOT NULL,
    question_id text NOT NULL,
    user_id text NOT NULL,
    choice integer,
    answer text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reactions (
    story_id uuid NOT NULL,
    user_id text NOT NULL,
    value smallint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reactions_value_check CHECK ((value = ANY (ARRAY['-1'::integer, 1])))
);


--
-- Name: reading_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reading_progress (
    user_id text NOT NULL,
    story_id uuid NOT NULL,
    chapter_index integer NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    page_index integer DEFAULT 0 NOT NULL,
    completed_chapter_count integer,
    page_count integer
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    user_id text NOT NULL,
    stars numeric(2,1) NOT NULL,
    liked text,
    disliked text,
    pinned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_stars_check CHECK (((stars >= 0.5) AND (stars <= 5.0)))
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    id text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL
);


--
-- Name: stories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    excerpt text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    embedding public.vector(384),
    summary text NOT NULL,
    chapters jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'published'::text NOT NULL,
    chapters_public boolean DEFAULT false NOT NULL,
    access_duration text DEFAULT 'always'::text NOT NULL,
    offered_durations text[] DEFAULT '{}'::text[] NOT NULL,
    whole_prices jsonb DEFAULT '{}'::jsonb NOT NULL,
    draft_expires_at timestamp with time zone,
    currency text DEFAULT 'INR'::text NOT NULL,
    cover_url text,
    cover_style jsonb,
    slug text,
    draft_of uuid,
    preview_public boolean DEFAULT false NOT NULL,
    CONSTRAINT stories_access_duration_chk CHECK ((access_duration = ANY (ARRAY['always'::text, '1h'::text, '1d'::text, '1w'::text, '1y'::text]))),
    CONSTRAINT stories_status_chk CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);


--
-- Name: story_genres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_genres (
    story_id uuid NOT NULL,
    genre_id integer NOT NULL
);


--
-- Name: story_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_views (
    story_id uuid NOT NULL,
    viewer_id text NOT NULL,
    day date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    subscriber_id text NOT NULL,
    author_id text NOT NULL,
    amount integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    expiry_notified boolean DEFAULT false NOT NULL,
    cancelled boolean DEFAULT false NOT NULL
);


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    username text,
    bio text,
    theme_mode text DEFAULT 'light'::text NOT NULL,
    accent_color text DEFAULT 'graphite'::text NOT NULL,
    background_preset text DEFAULT 'plain'::text NOT NULL,
    feed_wallpaper text,
    about text,
    subscription_price integer,
    shelf_style text DEFAULT 'walnut'::text NOT NULL,
    "verificationGraceUntil" timestamp with time zone
);


--
-- Name: user_genres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_genres (
    user_id text NOT NULL,
    genre_id integer NOT NULL
);


--
-- Name: user_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id text NOT NULL,
    reported_id text NOT NULL,
    reason text NOT NULL,
    details text,
    status text DEFAULT 'under_review'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_reports_status_check CHECK ((status = ANY (ARRAY['under_review'::text, 'dismissed'::text, 'actioned'::text])))
);


--
-- Name: verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: wallet_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_rate_limits (
    key text NOT NULL,
    window_start timestamp with time zone NOT NULL,
    requests integer NOT NULL
);


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    account_id uuid NOT NULL,
    provider_id text NOT NULL,
    currency text NOT NULL,
    amount bigint NOT NULL,
    fee bigint NOT NULL,
    net bigint NOT NULL,
    kind text NOT NULL,
    status text NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    available_at timestamp with time zone NOT NULL
);


--
-- Name: wallet_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_webhook_events (
    mode text NOT NULL,
    event_id text NOT NULL,
    processed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wallet_withdrawals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_withdrawals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    request_key uuid NOT NULL,
    amount bigint NOT NULL,
    currency text NOT NULL,
    source_type text NOT NULL,
    provider_id text,
    status text NOT NULL,
    arrival_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_withdrawals_amount_check CHECK (((amount > 0) AND (amount <= '9007199254740991'::bigint))),
    CONSTRAINT wallet_withdrawals_currency_check CHECK ((currency ~ '^[a-z]{3}$'::text)),
    CONSTRAINT wallet_withdrawals_source_type_check CHECK ((source_type = ANY (ARRAY['card'::text, 'bank_account'::text, 'fpx'::text]))),
    CONSTRAINT wallet_withdrawals_status_check CHECK ((status = ANY (ARRAY['reserved'::text, 'unknown'::text, 'pending'::text, 'in_transit'::text, 'paid'::text, 'failed'::text, 'canceled'::text])))
);


--
-- Name: genres id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.genres ALTER COLUMN id SET DEFAULT nextval('public.genres_id_seq'::regclass);


--
-- Name: access_grants access_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_grants
    ADD CONSTRAINT access_grants_pkey PRIMARY KEY (id);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: attributions attributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attributions
    ADD CONSTRAINT attributions_pkey PRIMARY KEY (id);


--
-- Name: attributions attributions_story_id_related_story_id_kind_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attributions
    ADD CONSTRAINT attributions_story_id_related_story_id_kind_key UNIQUE (story_id, related_story_id, kind);


--
-- Name: auth_verification_limits auth_verification_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_verification_limits
    ADD CONSTRAINT auth_verification_limits_pkey PRIMARY KEY (key);


--
-- Name: author_payment_accounts author_payment_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.author_payment_accounts
    ADD CONSTRAINT author_payment_accounts_pkey PRIMARY KEY (id);


--
-- Name: author_payment_accounts author_payment_accounts_provider_id_mode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.author_payment_accounts
    ADD CONSTRAINT author_payment_accounts_provider_id_mode_key UNIQUE (provider_id, mode);


--
-- Name: author_payment_accounts author_payment_accounts_user_id_mode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.author_payment_accounts
    ADD CONSTRAINT author_payment_accounts_user_id_mode_key UNIQUE (user_id, mode);


--
-- Name: bookmarks bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_pkey PRIMARY KEY (id);


--
-- Name: collection_stories collection_stories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_stories
    ADD CONSTRAINT collection_stories_pkey PRIMARY KEY (collection_id, story_id);


--
-- Name: collections collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_pkey PRIMARY KEY (id);


--
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (follower_id, following_id);


--
-- Name: genres genres_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_name_key UNIQUE (name);


--
-- Name: genres genres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_pkey PRIMARY KEY (id);


--
-- Name: genres genres_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_slug_key UNIQUE (slug);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payment_orders payment_orders_buyer_id_request_key_mode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_buyer_id_request_key_mode_key UNIQUE (buyer_id, request_key, mode);


--
-- Name: payment_orders payment_orders_checkout_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_checkout_session_id_key UNIQUE (checkout_session_id);


--
-- Name: payment_orders payment_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_pkey PRIMARY KEY (id);


--
-- Name: payment_webhook_events payment_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_webhook_events
    ADD CONSTRAINT payment_webhook_events_pkey PRIMARY KEY (mode, event_id);


--
-- Name: post_comments post_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_pkey PRIMARY KEY (id);


--
-- Name: post_likes post_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_pkey PRIMARY KEY (post_id, user_id);


--
-- Name: post_mentions post_mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_mentions
    ADD CONSTRAINT post_mentions_pkey PRIMARY KEY (post_id, user_id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_user_id_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);


--
-- Name: question_answers question_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_answers
    ADD CONSTRAINT question_answers_pkey PRIMARY KEY (id);


--
-- Name: question_answers question_answers_question_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_answers
    ADD CONSTRAINT question_answers_question_id_user_id_key UNIQUE (question_id, user_id);


--
-- Name: reactions reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_pkey PRIMARY KEY (story_id, user_id);


--
-- Name: reading_progress reading_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_progress
    ADD CONSTRAINT reading_progress_pkey PRIMARY KEY (user_id, story_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_story_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_story_id_user_id_key UNIQUE (story_id, user_id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_key UNIQUE (token);


--
-- Name: stories stories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_pkey PRIMARY KEY (id);


--
-- Name: story_genres story_genres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_genres
    ADD CONSTRAINT story_genres_pkey PRIMARY KEY (story_id, genre_id);


--
-- Name: story_views story_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_views
    ADD CONSTRAINT story_views_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (subscriber_id, author_id);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user_genres user_genres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_genres
    ADD CONSTRAINT user_genres_pkey PRIMARY KEY (user_id, genre_id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: user_reports user_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_pkey PRIMARY KEY (id);


--
-- Name: user_reports user_reports_reporter_id_reported_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_reporter_id_reported_id_key UNIQUE (reporter_id, reported_id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: wallet_rate_limits wallet_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_rate_limits
    ADD CONSTRAINT wallet_rate_limits_pkey PRIMARY KEY (key);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (account_id, provider_id);


--
-- Name: wallet_webhook_events wallet_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_webhook_events
    ADD CONSTRAINT wallet_webhook_events_pkey PRIMARY KEY (mode, event_id);


--
-- Name: wallet_withdrawals wallet_withdrawals_account_id_provider_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_withdrawals
    ADD CONSTRAINT wallet_withdrawals_account_id_provider_id_key UNIQUE (account_id, provider_id);


--
-- Name: wallet_withdrawals wallet_withdrawals_account_id_request_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_withdrawals
    ADD CONSTRAINT wallet_withdrawals_account_id_request_key_key UNIQUE (account_id, request_key);


--
-- Name: wallet_withdrawals wallet_withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_withdrawals
    ADD CONSTRAINT wallet_withdrawals_pkey PRIMARY KEY (id);


--
-- Name: access_grants_payment_item; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX access_grants_payment_item ON public.access_grants USING btree (payment_order_id, scope, COALESCE(chapter_index, '-1'::integer)) WHERE (payment_order_id IS NOT NULL);


--
-- Name: access_grants_story_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX access_grants_story_idx ON public.access_grants USING btree (story_id);


--
-- Name: access_grants_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX access_grants_user_idx ON public.access_grants USING btree (user_id);


--
-- Name: account_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "account_userId_idx" ON public.account USING btree ("userId");


--
-- Name: attributions_story_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attributions_story_idx ON public.attributions USING btree (story_id);


--
-- Name: bookmarks_user_story_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookmarks_user_story_idx ON public.bookmarks USING btree (user_id, story_id);


--
-- Name: collections_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX collections_user_idx ON public.collections USING btree (user_id);


--
-- Name: follows_follower_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX follows_follower_idx ON public.follows USING btree (follower_id);


--
-- Name: follows_following_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX follows_following_idx ON public.follows USING btree (following_id);


--
-- Name: notifications_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_idx ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: payment_orders_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_orders_buyer ON public.payment_orders USING btree (buyer_id, created_at DESC);


--
-- Name: payment_orders_open_basket; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payment_orders_open_basket ON public.payment_orders USING btree (buyer_id, story_id, request_hash, mode) WHERE (status = ANY (ARRAY['created'::text, 'checkout_open'::text]));


--
-- Name: post_comments_post_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_comments_post_idx ON public.post_comments USING btree (post_id, created_at);


--
-- Name: post_mentions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_mentions_user_idx ON public.post_mentions USING btree (user_id);


--
-- Name: posts_answer_story_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_answer_story_idx ON public.posts USING btree (answer_story_id);


--
-- Name: posts_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_author_idx ON public.posts USING btree (author_id, created_at DESC);


--
-- Name: posts_recent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX posts_recent_idx ON public.posts USING btree (created_at DESC);


--
-- Name: push_subscriptions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX push_subscriptions_user_idx ON public.push_subscriptions USING btree (user_id);


--
-- Name: question_answers_q_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX question_answers_q_idx ON public.question_answers USING btree (question_id);


--
-- Name: reactions_story_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reactions_story_idx ON public.reactions USING btree (story_id);


--
-- Name: reading_progress_recent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reading_progress_recent_idx ON public.reading_progress USING btree (user_id, updated_at DESC);


--
-- Name: reviews_story_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_story_idx ON public.reviews USING btree (story_id);


--
-- Name: session_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "session_userId_idx" ON public.session USING btree ("userId");


--
-- Name: stories_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stories_author_idx ON public.stories USING btree (author_id);


--
-- Name: stories_body_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stories_body_trgm_idx ON public.stories USING gin (body public.gin_trgm_ops);


--
-- Name: stories_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stories_created_at_idx ON public.stories USING btree (created_at DESC);


--
-- Name: stories_draft_of_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX stories_draft_of_key ON public.stories USING btree (draft_of) WHERE (draft_of IS NOT NULL);


--
-- Name: stories_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stories_embedding_idx ON public.stories USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: stories_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX stories_slug_key ON public.stories USING btree (slug);


--
-- Name: stories_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stories_status_idx ON public.stories USING btree (status);


--
-- Name: story_views_day_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX story_views_day_idx ON public.story_views USING btree (day);


--
-- Name: story_views_dedupe_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX story_views_dedupe_idx ON public.story_views USING btree (story_id, viewer_id, created_at DESC);


--
-- Name: story_views_story_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX story_views_story_idx ON public.story_views USING btree (story_id);


--
-- Name: subscriptions_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_author_idx ON public.subscriptions USING btree (author_id);


--
-- Name: user_genres_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_genres_user_idx ON public.user_genres USING btree (user_id);


--
-- Name: user_name_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_name_trgm_idx ON public."user" USING gin (name public.gin_trgm_ops);


--
-- Name: user_reports_reported_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_reports_reported_idx ON public.user_reports USING btree (reported_id);


--
-- Name: user_username_lower_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_username_lower_idx ON public."user" USING btree (lower(username));


--
-- Name: user_username_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_username_trgm_idx ON public."user" USING gin (username public.gin_trgm_ops);


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verification_identifier_idx ON public.verification USING btree (identifier);


--
-- Name: wallet_withdrawals_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wallet_withdrawals_account ON public.wallet_withdrawals USING btree (account_id, created_at DESC);


--
-- Name: access_grants access_grants_payment_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_grants
    ADD CONSTRAINT access_grants_payment_order_id_fkey FOREIGN KEY (payment_order_id) REFERENCES public.payment_orders(id);


--
-- Name: access_grants access_grants_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_grants
    ADD CONSTRAINT access_grants_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: access_grants access_grants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_grants
    ADD CONSTRAINT access_grants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: attributions attributions_related_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attributions
    ADD CONSTRAINT attributions_related_story_id_fkey FOREIGN KEY (related_story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: attributions attributions_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attributions
    ADD CONSTRAINT attributions_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: author_payment_accounts author_payment_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.author_payment_accounts
    ADD CONSTRAINT author_payment_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: bookmarks bookmarks_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: bookmarks bookmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: collection_stories collection_stories_collection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_stories
    ADD CONSTRAINT collection_stories_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE;


--
-- Name: collection_stories collection_stories_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_stories
    ADD CONSTRAINT collection_stories_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: collections collections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: follows follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: follows follows_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: payment_orders payment_orders_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: payment_orders payment_orders_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: payment_orders payment_orders_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE SET NULL;


--
-- Name: post_comments post_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: post_comments post_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_likes post_likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_likes post_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: post_mentions post_mentions_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_mentions
    ADD CONSTRAINT post_mentions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_mentions post_mentions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_mentions
    ADD CONSTRAINT post_mentions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: posts posts_answer_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_answer_story_id_fkey FOREIGN KEY (answer_story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: posts posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: question_answers question_answers_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_answers
    ADD CONSTRAINT question_answers_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: question_answers question_answers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_answers
    ADD CONSTRAINT question_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: reactions reactions_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: reactions reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: reading_progress reading_progress_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_progress
    ADD CONSTRAINT reading_progress_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: reading_progress reading_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_progress
    ADD CONSTRAINT reading_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: stories stories_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: stories stories_draft_of_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_draft_of_fkey FOREIGN KEY (draft_of) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: story_genres story_genres_genre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_genres
    ADD CONSTRAINT story_genres_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id) ON DELETE CASCADE;


--
-- Name: story_genres story_genres_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_genres
    ADD CONSTRAINT story_genres_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: story_views story_views_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_views
    ADD CONSTRAINT story_views_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: story_views story_views_viewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_views
    ADD CONSTRAINT story_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_author_id_fkey FOREIGN KEY (author_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_subscriber_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_subscriber_id_fkey FOREIGN KEY (subscriber_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: user_genres user_genres_genre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_genres
    ADD CONSTRAINT user_genres_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id) ON DELETE CASCADE;


--
-- Name: user_genres user_genres_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_genres
    ADD CONSTRAINT user_genres_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: user_reports user_reports_reported_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_reported_id_fkey FOREIGN KEY (reported_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: user_reports user_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.author_payment_accounts(id);


--
-- Name: wallet_withdrawals wallet_withdrawals_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_withdrawals
    ADD CONSTRAINT wallet_withdrawals_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.author_payment_accounts(id);


--
-- PostgreSQL database dump complete
--

\unrestrict zYZ87B9C2LAjfJe5EtKNi7s0lWFW65U3zlPxs9MMQEgY390wF492jObdSKsPsat

