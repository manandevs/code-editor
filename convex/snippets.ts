// convex/snippets.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createSnippets = mutation({
  args: {
    title: v.string(),
    language: v.string(),
    code: v.string(),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    return await ctx.db.insert("snippets", {
      userId: identity.subject,
      userName: user.name,
      title: args.title,
      language: args.language,
      code: args.code,
    });
  },
});

export const deleteSnippet = mutation({
  args: {
    snippetId: v.id("snippets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authorized");

    const snippet = await ctx.db.get(args.snippetId);
    // FIX: Guard against null before comparing
    if (!snippet || snippet.userId !== identity.subject) {
      throw new Error("Not authorized to delete this snippet");
    }

    const comments = await ctx.db
      .query("snippetComments")
      .withIndex("by_snippet_id", (q) => q.eq("snippetId", args.snippetId))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    const stars = await ctx.db
      .query("stars")
      .withIndex("by_snippet_id", (q) => q.eq("snippetId", args.snippetId))
      .collect();

    for (const s of stars) {
      await ctx.db.delete(s._id);
    }

    await ctx.db.delete(args.snippetId);
  },
});

export const starSnipet = mutation({
  args: {
    snippetId: v.id("snippets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("stars")
      .withIndex("by_user_id_and_snippet_id", (q) =>
        q.eq("userId", identity.subject).eq("snippetId", args.snippetId) // FIX: Correct variable comparison
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("stars", {
        userId: identity.subject,
        snippetId: args.snippetId,
      });
    }
  },
});

export const addComment = mutation({
  args: {
    snippetId: v.id("snippets"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    return await ctx.db.insert("snippetComments", {
      snippetId: args.snippetId,
      userId: identity.subject,
      userName: user.name,
      content: args.content,
    });
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("snippetComments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    if (comment.userId !== identity.subject) {
      throw new Error("Not authorized to delete this comment");
    }

    await ctx.db.delete(args.commentId);
  },
});

export const getSnippets = query({
  handler: async (ctx) => {
    return await ctx.db.query("snippets").order("desc").collect();
  },
});

export const getSnippetsById = query({
  args: { snippetId: v.id("snippets") },
  handler: async (ctx, args_0) => {
    const snippet = await ctx.db.get(args_0.snippetId);
    if (!snippet) throw new Error("Snippet not found");
    return snippet;
  },
});

export const getComments = query({
  args: { snippentId: v.id("snippets") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("snippetComments")
      .withIndex("by_snippet_id", (q) => q.eq("snippetId", args.snippentId))
      .order("desc")
      .collect();
  },
});

export const isSnippetsStarered = query({
  args: { snippetId: v.id("snippets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const star = await ctx.db
      .query("stars")
      .withIndex("by_user_id_and_snippet_id", (q) =>
        q.eq("userId", identity.subject).eq("snippetId", args.snippetId)
      )
      .first();

    return !!star;
  },
});

export const getSnippetsStarCount = query({
  args: { snippetId: v.id("snippets") },
  handler: async (ctx, args) => {
    const stars = await ctx.db
      .query("stars")
      .withIndex("by_snippet_id", (q) => q.eq("snippetId", args.snippetId))
      .collect();
    return stars.length;
  },
});

export const getStarredSnippets = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const stars = await ctx.db
      .query("stars")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .collect();

    const snippets = await Promise.all(stars.map((star) => ctx.db.get(star.snippetId)));
    return snippets.filter((snippet) => snippet !== null);
  },
});