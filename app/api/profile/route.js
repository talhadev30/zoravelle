import { connectDB } from "@/lib/db";
import { getCurrentUser, publicUser } from "@/lib/auth";
import { User } from "@/lib/models";
import { isSameOriginRequest } from "@/lib/security";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user)
      return Response.json(
        { error: "Please log in to view your profile." },
        { status: 401 },
      );
    return Response.json({ user });
  } catch {
    return Response.json({ error: "Profile is unavailable." }, { status: 503 });
  }
}

export async function PATCH(request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "This request is not allowed." }, { status: 403 });
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser)
      return Response.json(
        { error: "Please log in to update your profile." },
        { status: 401 },
      );
    const body = await request.json();
    const profile = {
      name: String(body.name || "").trim(),
      email: String(body.email || "")
        .trim()
        .toLowerCase(),
      phone: String(body.phone || "").trim(),
      address: String(body.address || "").trim(),
      city: String(body.city || "").trim(),
      postalCode: String(body.postalCode || "").trim(),
    };
    if (profile.name.length < 2 || profile.name.length > 80)
      return Response.json(
        { error: "Enter a name between 2 and 80 characters." },
        { status: 400 },
      );
    if (
      body.completeProfile &&
      (!profile.phone || !profile.address || !profile.city)
    )
      return Response.json(
        { error: "Add your phone, street address, and city to continue." },
        { status: 400 },
      );
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email) ||
      profile.email.length > 254
    )
      return Response.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    if (
      profile.phone.length > 40 ||
      profile.address.length > 180 ||
      profile.city.length > 80 ||
      profile.postalCode.length > 20
    )
      return Response.json(
        { error: "One or more profile fields are too long." },
        { status: 400 },
      );
    await connectDB();
    const updated = await User.findByIdAndUpdate(
      currentUser.id,
      { $set: profile },
      { new: true, runValidators: true },
    );
    if (!updated)
      return Response.json({ error: "Account not found." }, { status: 404 });
    return Response.json({ ok: true, user: publicUser(updated) });
  } catch (error) {
    if (error?.code === 11000)
      return Response.json(
        { error: "That email is already used by another account." },
        { status: 409 },
      );
    return Response.json(
      { error: "Could not update your profile." },
      { status: 503 },
    );
  }
}
