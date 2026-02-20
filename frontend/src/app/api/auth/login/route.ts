import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('✅ Login API POST handler called successfully');
     
  try {
    const body = await request.json();
    const { email, password } = body;
       
    console.log('Login attempt for:', email);

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // TEMPORARY: Mock user authentication for testing
    // Replace this with your actual database logic
    const mockUsers = [
      {
        email: 'jatin.bagul13@gmail.com',
        password: 'password123',
        username: 'jatin',
        id: 1
      },
      {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        id: 2
      }
    ];

    const mockUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
       
    if (!mockUser || mockUser.password !== password) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    console.log('✅ Login successful for:', email);

    // Return success response
    return NextResponse.json(
      {
         message: 'Login successful.',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username
        }
      },
      { status: 200 }
    );
   
  } catch (error: unknown) {
    console.error('❌ Login Error:', error);
       
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
       
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'GET method not supported on login endpoint. Use POST instead.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'PUT method not supported on login endpoint. Use POST instead.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'DELETE method not supported on login endpoint. Use POST instead.' },
    { status: 405 }
  );
}