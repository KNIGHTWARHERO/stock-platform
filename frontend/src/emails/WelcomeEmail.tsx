import {
  Body,
  Button,
  Container,
  Head,

  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
  username: string;
}

export const WelcomeEmail = ({ username }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to StockSphere!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome aboard, {username}!</Heading>
        <Text style={text}>
          Thank you for registering with StockSphere. We're excited to help you navigate the markets with confidence.
        </Text>
        <Text style={text}>
          You can now log in to your account and start exploring.
        </Text>
        <Button
          style={btn}
          href="http://localhost:3000/login" // Change this to your actual login URL in production
        >
          Go to Your Dashboard
        </Button>
      </Container>
    </Body>
  </Html>
);

export default WelcomeEmail;

// --- Basic Styles for the Email ---
const main = {
  backgroundColor: '#020617', // slate-950
  color: '#f8fafc', // slate-50
  fontFamily: 'Helvetica,Arial,sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '580px',
};

const h1 = {
  fontSize: '24px',
  fontWeight: 'bold',
  lineHeight: '1.2',
  margin: '30px 0',
};

const text = {
  fontSize: '16px',
  lineHeight: '26px',
};

const btn = {
  backgroundColor: '#0ea5e9', // sky-500
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '200px',
  marginTop: '25px',
  padding: '12px 20px',
};