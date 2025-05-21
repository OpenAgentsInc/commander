import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Nip90ConsumerChatPane from '@/components/nip90_consumer_chat/Nip90ConsumerChatPane';

describe('Nip90ConsumerChatPane', () => {
  it('renders placeholder content', () => {
    render(<Nip90ConsumerChatPane />);
    expect(screen.getByTestId('nip90-consumer-chat-pane')).toHaveTextContent('NIP-90 Consumer Chat Pane Placeholder');
  });
});