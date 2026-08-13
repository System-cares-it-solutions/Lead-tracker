import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import { fetchProducts } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { ShoppingBag, MessageCircle, Mail, CheckCircle2, Send, Tag, Sparkles } from 'lucide-react';
import '../products/ShareProductModal.css';

/**
 * Modal component allowing Employees and Admins to share a product directly with a Lead from the Leads Table.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   lead: object|null,
 *   onAddActivity?: (leadId: string, activity: object) => Promise<void>,
 *   onStatusChange?: (leadId: string, status: string) => Promise<void>
 * }} props
 */
export default function ShareProductToLeadModal({ isOpen, onClose, lead, onAddActivity, onStatusChange }) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sentSuccessMsg, setSentSuccessMsg] = useState('');

  // Fetch products catalog on open
  useEffect(() => {
    if (isOpen && lead) {
      setSentSuccessMsg('');
      async function loadCatalog() {
        try {
          setLoading(true);
          const data = await fetchProducts();
          setProducts(data);
          if (data.length > 0) {
            setSelectedProductId(data[0].id || data[0]._id);
          }
        } catch (err) {
          console.error('Failed to load products:', err);
        } finally {
          setLoading(false);
        }
      }
      loadCatalog();
    }
  }, [isOpen, lead]);

  const selectedProduct = products.find(
    (p) => p.id === selectedProductId || p._id === selectedProductId
  );

  // Auto-generate message when product or lead changes
  useEffect(() => {
    if (!selectedProduct || !lead) return;

    const priceFormatted = Number(selectedProduct.price).toLocaleString('en-IN');
    let specsText = '';
    if (selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0) {
      specsText = '\n\n*Key Specifications:*\n' + Object.entries(selectedProduct.specifications)
        .slice(0, 4)
        .map(([k, v]) => `• ${k}: ${v}`)
        .join('\n');
    }

    const defaultMsg = `Hello ${lead.name || 'Valued Customer'},

I wanted to share this product details with you:

📌 *${selectedProduct.name}*
🏷️ Category: ${selectedProduct.category || 'N/A'}
💰 Price: ₹${priceFormatted}

${selectedProduct.description || ''}${specsText}

Feel free to reply if you have any questions or would like to request a quote!

Best regards,
${user?.name || 'Lead Tracker Team'}`;

    setMessage(defaultMsg);
  }, [selectedProduct, lead, user?.name]);

  if (!isOpen || !lead) return null;

  // Clean phone number for WhatsApp
  const cleanPhoneForWhatsApp = (phoneStr) => {
    if (!phoneStr || phoneStr === '—') return '';
    let cleaned = phoneStr.replace(/\D/g, '');
    if (cleaned.length === 10) {
      cleaned = `91${cleaned}`;
    }
    return cleaned;
  };

  /* ── Share via WhatsApp ── */
  const handleShareWhatsApp = async () => {
    const rawPhone = lead.phone || '';
    const formattedPhone = cleanPhoneForWhatsApp(rawPhone);

    const waUrl = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');

    const leadId = lead.id || lead._id;
    if ((lead.status || 'New') === 'New' && onStatusChange) {
      try {
        await onStatusChange(leadId, 'Contacted');
      } catch (e) {
        console.error('Failed to update status to Contacted:', e);
      }
    }

    if (onAddActivity && selectedProduct) {
      try {
        await onAddActivity(leadId, {
          type: 'note',
          note: `Shared product "${selectedProduct.name}" via WhatsApp. Status set to Contacted.`,
          authorName: user?.name || 'System',
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Failed to log activity:', e);
      }
    }

    setSentSuccessMsg(`Product "${selectedProduct?.name}" shared via WhatsApp with ${lead.name}! Status updated to Contacted.`);
  };

  /* ── Share via Email ── */
  const handleShareEmail = async () => {
    const emailAddr = (lead.email && lead.email !== '—') ? lead.email : '';
    const subject = `Product Details: ${selectedProduct?.name || 'Product Info'}`;
    const mailtoUrl = `mailto:${emailAddr}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

    window.open(mailtoUrl, '_self');

    const leadId = lead.id || lead._id;
    if ((lead.status || 'New') === 'New' && onStatusChange) {
      try {
        await onStatusChange(leadId, 'Contacted');
      } catch (e) {
        console.error('Failed to update status to Contacted:', e);
      }
    }

    if (onAddActivity && selectedProduct) {
      try {
        await onAddActivity(leadId, {
          type: 'note',
          note: `Shared product "${selectedProduct.name}" via Email. Status set to Contacted.`,
          authorName: user?.name || 'System',
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Failed to log activity:', e);
      }
    }

    setSentSuccessMsg(`Product "${selectedProduct?.name}" shared via Email with ${lead.name}! Status updated to Contacted.`);
  };

  const footer = (
    <Button variant="secondary" onClick={onClose}>
      Close
    </Button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Tag size={18} color="var(--color-primary)" />
          <span>Share Product with Lead: {lead.name}</span>
        </div>
      }
      footer={footer}
    >
      <div className="share-product-modal">
        {/* Lead Target Banner */}
        <div className="share-product-modal__lead-details">
          <div><strong>Lead Name:</strong> {lead.name}</div>
          <div><strong>Phone:</strong> {lead.phone || 'N/A'}</div>
          <div><strong>Email:</strong> {lead.email || 'N/A'}</div>
          <div><strong>Location:</strong> {lead.location || 'N/A'}</div>
        </div>

        {/* Product Selector */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
            <Spinner size="sm" />
          </div>
        ) : (
          <div className="share-product-modal__section">
            <label className="share-product-modal__label">
              <ShoppingBag size={14} /> Select Product to Share
            </label>
            <select
              className="share-product-modal__select"
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setSentSuccessMsg('');
              }}
            >
              {products.map((p) => (
                <option key={p.id || p._id} value={p.id || p._id}>
                  {p.name} — ₹{Number(p.price).toLocaleString('en-IN')} ({p.category})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Selected Product Card Preview */}
        {selectedProduct && (
          <div className="share-product-modal__product-card">
            <img
              src={selectedProduct.image}
              alt={selectedProduct.name}
              className="share-product-modal__product-thumb"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><rect width="60" height="60" fill="%231e2030"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="10">Product</text></svg>';
              }}
            />
            <div className="share-product-modal__product-info">
              <div className="share-product-modal__product-category">{selectedProduct.category}</div>
              <div className="share-product-modal__product-title">{selectedProduct.name}</div>
              <div className="share-product-modal__product-price">₹{Number(selectedProduct.price).toLocaleString('en-IN')}</div>
            </div>
          </div>
        )}

        {/* Message Preview */}
        <div className="share-product-modal__section">
          <label className="share-product-modal__label">
            <Send size={14} /> Message Preview
          </label>
          <textarea
            className="share-product-modal__textarea"
            rows={7}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {/* Success Alert */}
        {sentSuccessMsg && (
          <div className="share-product-modal__alert">
            <CheckCircle2 size={16} />
            <span>{sentSuccessMsg}</span>
          </div>
        )}

        {/* Actions */}
        <div className="share-product-modal__actions">
          <button
            type="button"
            className="share-btn-whatsapp"
            onClick={handleShareWhatsApp}
            disabled={!selectedProduct}
          >
            <MessageCircle size={18} /> Share via WhatsApp
          </button>
          <button
            type="button"
            className="share-btn-email"
            onClick={handleShareEmail}
            disabled={!selectedProduct}
          >
            <Mail size={18} /> Share via Email
          </button>
        </div>
      </div>
    </Modal>
  );
}
