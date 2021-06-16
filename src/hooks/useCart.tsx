import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: product } = await api.get<Product>(
        `/products/${productId}`
      );
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      const productIndex = cart.findIndex((p) => p.id === productId);

      if (productIndex < 0 && stock.amount >= 1) {
        setCart([...cart, { ...product, amount: 1 }]);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...cart, { ...product, amount: 1 }])
        );
      } else {
        if (cart[productIndex].amount < stock.amount) {
          cart[productIndex].amount += 1;
          setCart([...cart]);
          localStorage.setItem("@RocketShoes:cart", JSON.stringify([...cart]));
        } else {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find((p) => p.id === productId);

      if (!product) {
        throw new Error("Product not found!");
      }
      const auxCart = cart.filter((product) => product.id !== productId);
      setCart(auxCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(auxCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const { data: stock } = await api.get(`/stock/${productId}`);

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const productIndex = cart.findIndex((p) => p.id === productId);
      cart[productIndex].amount = amount;

      setCart([...cart]);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify([...cart]));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
