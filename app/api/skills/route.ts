import { NextRequest, NextResponse } from 'next/server';
import { db, skills } from '@/lib/db';

// GET /api/skills - List all available skills
export async function GET() {
  try {
    const allSkills = db.select().from(skills).all();

    // Transform to match frontend types
    const transformed = allSkills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      displayName: skill.displayName,
      description: skill.description,
      category: skill.category,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
  }
}
