import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { createCustomerMessage, getCustomerMessages } from '../services/supabaseService';
import { CustomerMessage } from '../types';
import { Send, Clock } from 'lucide-react';
import { toast } from 'react-toastify';

export default function CustomerPortalContact() {
  const { customerPortalUser } = useAuth();
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!customerPortalUser || !customerPortalUser.customer_id) {
        setError("Cannot load messages: No customer account is linked.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await getCustomerMessages(customerPortalUser.customer_id);
        setMessages(data);
      } catch (err) {
        setError("Failed to load message history.");
        toast.error("Could not load messages.");
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [customerPortalUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !customerPortalUser || !customerPortalUser.customer_id) {
      toast.warn("Message cannot be empty.");
      return;
    }

    setSending(true);
    try {
      const createdMessage = await createCustomerMessage({
        customer_id: customerPortalUser.customer_id,
        message: newMessage,
        subject: 'New Support Request', // Default value from form
        category: 'General Inquiry',   // Default value from form
        status: 'open',                // Default value from form
      });
      setMessages(prevMessages => [...prevMessages, createdMessage]);
      setNewMessage('');
      toast.success("Message sent!");
    } catch (err) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <h1 className="text-3xl font-bold text-white mb-4">Contact Support</h1>
      <div className="flex-grow bg-gray-900/50 border border-gray-700 rounded-lg p-4 overflow-y-auto mb-4">
        {loading && <p className="text-center text-gray-400">Loading messages...</p>}
        {error && <p className="text-center text-red-400">{error}</p>}
        {!loading && !error && messages.length === 0 && (
          <p className="text-center text-gray-400">No messages yet. Send one below to start a conversation.</p>
        )}
        <div className="space-y-4">
          {messages.map((msg) => (
            // All messages from this table are from the customer, so we align them to the right.
            <div key={msg.id} className="flex items-end gap-2 justify-end">
              <div className="max-w-lg p-3 rounded-lg bg-blue-600 text-white">
                <p className="font-bold">{msg.subject} <span className="ml-2 text-xs font-normal opacity-80 bg-blue-500 px-2 py-0.5 rounded-full">{msg.status}</span></p>
                <p className="mt-1">{msg.message}</p>
                <div className="text-xs opacity-70 mt-2 flex items-center gap-1">
                  <Clock size={12} />
                  <span>{new Date(msg.created_at!).toLocaleString()}</span>
                </div>
                {/* Display admin notes as a reply */}
                {msg.admin_notes && (
                    <div className="mt-2 pt-2 border-t border-blue-500">
                        <p className="text-xs font-bold text-blue-200">Admin Reply:</p>
                        <p className="text-sm text-blue-100 whitespace-pre-wrap">{msg.admin_notes}</p>
                    </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-4">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message here..."
          className="flex-grow bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          disabled={sending || !customerPortalUser?.customer_id}
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={sending || !newMessage.trim()}
        >
          <Send size={20} className="mr-2" />
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}