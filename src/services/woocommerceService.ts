import { supabase } from '../lib/supabase';
import { WooCommerceOrder, WooCommerceProduct, WooCommerceSubscription, WooCommerceSyncLog } from '../types';

export const woocommerceService = {
  async fetchOrders(filters?: {
    status?: string;
    customerEmail?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<WooCommerceOrder[]> {
    try {
      let query = supabase
        .from('woocommerce_orders')
        .select('*')
        .order('order_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('order_status', filters.status);
      }

      if (filters?.customerEmail) {
        query = query.ilike('customer_email', `%${filters.customerEmail}%`);
      }

      if (filters?.startDate) {
        query = query.gte('order_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('order_date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((order: any) => ({
        id: order.id,
        wooOrderId: order.woo_order_id,
        customerId: order.customer_id,
        customerEmail: order.customer_email,
        customerName: order.customer_name,
        orderNumber: order.order_number,
        orderStatus: order.order_status,
        totalAmount: order.total_amount,
        currency: order.currency,
        paymentMethod: order.payment_method,
        paymentMethodTitle: order.payment_method_title,
        transactionId: order.transaction_id,
        orderDate: order.order_date,
        completedDate: order.completed_date,
        products: order.products,
        billingInfo: order.billing_info,
        shippingInfo: order.shipping_info,
        customerNote: order.customer_note,
        metadata: order.metadata,
        syncedAt: order.synced_at,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching WooCommerce orders:', error);
      throw error;
    }
  },

  async getOrderById(orderId: string): Promise<WooCommerceOrder | null> {
    try {
      const { data, error } = await supabase
        .from('woocommerce_orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        wooOrderId: data.woo_order_id,
        customerId: data.customer_id,
        customerEmail: data.customer_email,
        customerName: data.customer_name,
        orderNumber: data.order_number,
        orderStatus: data.order_status,
        totalAmount: data.total_amount,
        currency: data.currency,
        paymentMethod: data.payment_method,
        paymentMethodTitle: data.payment_method_title,
        transactionId: data.transaction_id,
        orderDate: data.order_date,
        completedDate: data.completed_date,
        products: data.products,
        billingInfo: data.billing_info,
        shippingInfo: data.shipping_info,
        customerNote: data.customer_note,
        metadata: data.metadata,
        syncedAt: data.synced_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  },

  async fetchProducts(): Promise<WooCommerceProduct[]> {
    try {
      const { data, error } = await supabase
        .from('woocommerce_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((product: any) => ({
        id: product.id,
        wooProductId: product.woo_product_id,
        name: product.name,
        sku: product.sku,
        type: product.type,
        price: product.price,
        regularPrice: product.regular_price,
        salePrice: product.sale_price,
        isSubscription: product.is_subscription,
        subscriptionPeriod: product.subscription_period,
        subscriptionInterval: product.subscription_interval,
        description: product.description,
        shortDescription: product.short_description,
        categories: product.categories,
        metadata: product.metadata,
        syncedAt: product.synced_at,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching WooCommerce products:', error);
      throw error;
    }
  },

  async fetchSubscriptions(customerId?: string): Promise<WooCommerceSubscription[]> {
    try {
      let query = supabase
        .from('woocommerce_subscriptions')
        .select('*')
        .order('start_date', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((sub: any) => ({
        id: sub.id,
        wooSubscriptionId: sub.woo_subscription_id,
        customerId: sub.customer_id,
        orderId: sub.order_id,
        productId: sub.product_id,
        status: sub.status,
        startDate: sub.start_date,
        nextPaymentDate: sub.next_payment_date,
        endDate: sub.end_date,
        trialEndDate: sub.trial_end_date,
        billingPeriod: sub.billing_period,
        billingInterval: sub.billing_interval,
        totalAmount: sub.total_amount,
        metadata: sub.metadata,
        syncedAt: sub.synced_at,
        createdAt: sub.created_at,
        updatedAt: sub.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching WooCommerce subscriptions:', error);
      throw error;
    }
  },

  async fetchSyncLogs(limit: number = 50): Promise<WooCommerceSyncLog[]> {
    try {
      const { data, error } = await supabase
        .from('woocommerce_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((log: any) => ({
        id: log.id,
        syncType: log.sync_type,
        wooId: log.woo_id,
        status: log.status,
        errorMessage: log.error_message,
        payload: log.payload,
        processedAt: log.processed_at,
        createdAt: log.created_at,
      }));
    } catch (error) {
      console.error('Error fetching sync logs:', error);
      throw error;
    }
  },

  async getOrderStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    cancelled: number;
    totalRevenue: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('woocommerce_orders')
        .select('order_status, total_amount');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        pending: 0,
        processing: 0,
        completed: 0,
        cancelled: 0,
        totalRevenue: 0,
      };

      data?.forEach((order: any) => {
        if (order.order_status === 'pending') stats.pending++;
        if (order.order_status === 'processing') stats.processing++;
        if (order.order_status === 'completed') stats.completed++;
        if (order.order_status === 'cancelled' || order.order_status === 'refunded') stats.cancelled++;
        if (order.order_status === 'completed') {
          stats.totalRevenue += parseFloat(order.total_amount || 0);
        }
      });

      return stats;
    } catch (error) {
      console.error('Error fetching order stats:', error);
      throw error;
    }
  },

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('woocommerce_orders')
        .update({ order_status: status })
        .eq('id', orderId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },
};
