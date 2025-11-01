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
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!customerPortalUser || !customerPortalUser.customer_id) {
        setError("No customer account is found for this user.");
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
    if (!newMessage.trim() || !subject.trim() || !customerPortalUser || !customerPortalUser.customer_id) {
      toast.warn("Subject and message cannot be empty.");
      return;
    }

    setSending(true);
    try {
      const createdMessage = await createCustomerMessage({
        customer_id: customerPortalUser.customer_id,
        message: newMessage,
        subject: subject,
        category: 'General Inquiry',   // Default value from form
        status: 'open',                // Default value from form
      });
      setMessages(prevMessages => [...prevMessages, createdMessage]);
      setNewMessage('');
      setSubject('');
      toast.success("Message sent!");
    } catch (err) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Contact Support</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <h2 className="text-xl font-semibold text-gray-700 mb-3">Message History</h2>
                <div className="space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className="bg-gray-100 p-4 rounded-lg">
                            <p className="font-bold">{msg.subject}</p>
                            <p>{msg.message}</p>
                            <div className="text-xs text-gray-500 mt-2">
                                <span>{new Date(msg.created_at!).toLocaleString()}</span>
                                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${msg.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>{msg.status}</span>
                            </div>
                            {msg.admin_notes && (
                                <div className="mt-2 pt-2 border-t">
                                    <p className="text-xs font-bold">Admin Reply:</p>
                                    <p className="text-sm">{msg.admin_notes}</p>
                                </div>
                            )}
                        </div>
                    ))}
                    {messages.length === 0 && (
                        <p>No messages yet.</p>
                    )}
                </div>
            </div>
            <div>
                <h2 className="text-xl font-semibold text-gray-700 mb-3">New Support Ticket</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject</label>
                        <input
                            type="text"
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            disabled={sending || !customerPortalUser?.customer_id}
                        />
                    </div>
                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
                        <textarea
                            id="message"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            rows={4}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            disabled={sending || !customerPortalUser?.customer_id}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        disabled={sending || !newMessage.trim() || !subject.trim()}
                    >
                        {sending ? 'Sending...' : 'Submit Ticket'}
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
}