import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyInCart = cart.find(
        (product) => product.id === productId
      );
      if (!productAlreadyInCart) {
        const { data: product } = await api.get<Product>(
          `products/${productId}`
        );
        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        if (stock.amount > 0) {
          setCart([...cart, { ...product, amount: 1 }]);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, { ...product, amount: 1 }]));
          return;
        }
      }

      if (productAlreadyInCart) {
        const { data: stock } = await api.get<Stock>(`stock/${productId}`);

        const cartProduct = cart.find((item) => item.id === productId);
        if (cartProduct && stock.amount <= cartProduct.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        if (cartProduct && stock.amount > cartProduct.amount) {
          cartProduct.amount++;
        }

        setCart([...cart]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
        return;
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const excludeProduct = cart.find((product) => product.id === productId);
      if (excludeProduct && excludeProduct.amount > 0) {
        const newCart = cart.filter((product) => product.id !== productId);
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {
        toast.error('Erro na remoção do produto');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      cart.map((product) => {
        if (product.id === productId) {
          if (product.amount <= 0) {
            return;
          }

          if (amount <= stock.amount) {
            if (product.amount === 1 && amount < product.amount) {
              return;
            }
            product.amount = amount;
            setCart([...cart]);
            localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
            return;
          }

          if (amount > stock.amount) {
            toast.error('Quantidade solicitada fora de estoque');
            return;
          }
        }
      });
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
