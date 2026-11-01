CREATE TYPE "public"."approval_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "approval_rule_approvers" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "approval_rule_approvers_order" UNIQUE("rule_id","position")
);
--> statement-breakpoint
CREATE TABLE "approval_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_id" integer NOT NULL,
	"minimum_total_cents" integer NOT NULL,
	"maximum_total_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_rules_work_range" UNIQUE("work_id","minimum_total_cents")
);
--> statement-breakpoint
CREATE TABLE "purchase_order_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"approver_id" integer NOT NULL,
	"position" integer NOT NULL,
	"status" "approval_status" DEFAULT 'PENDING' NOT NULL,
	"decided_at" timestamp with time zone,
	"rejection_reason" varchar(1000),
	CONSTRAINT "purchase_order_approvals_order_position" UNIQUE("order_id","position")
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"description" varchar(500) NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"total_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"order_date" timestamp with time zone NOT NULL,
	"notes" varchar(2000),
	"total_cents" integer NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(180) NOT NULL,
	"document" varchar(30) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_document_unique" UNIQUE("document")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "works" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approval_rule_approvers" ADD CONSTRAINT "approval_rule_approvers_rule_id_approval_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."approval_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_rule_approvers" ADD CONSTRAINT "approval_rule_approvers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_rules" ADD CONSTRAINT "approval_rules_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_approvals" ADD CONSTRAINT "purchase_order_approvals_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_approvals" ADD CONSTRAINT "purchase_order_approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;