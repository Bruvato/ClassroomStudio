/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as announcements from "../announcements.js";
import type * as assignments from "../assignments.js";
import type * as auth from "../auth.js";
import type * as classrooms from "../classrooms.js";
import type * as files from "../files.js";
import type * as grading from "../grading.js";
import type * as http from "../http.js";
import type * as members from "../members.js";
import type * as permissions from "../permissions.js";
import type * as submissions from "../submissions.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  announcements: typeof announcements;
  assignments: typeof assignments;
  auth: typeof auth;
  classrooms: typeof classrooms;
  files: typeof files;
  grading: typeof grading;
  http: typeof http;
  members: typeof members;
  permissions: typeof permissions;
  submissions: typeof submissions;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
