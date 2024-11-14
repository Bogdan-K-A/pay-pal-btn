import React, { useEffect, useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import translateOrderValues from "../../utils/useTranslatedOrder";
import { handleRequestPaypal } from "../../redux/basket/basket";

function PayPalBtn({ handleSubmit, setFieldValue }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { orders, totalPrice } = useSelector((state) => state.basket);
  const [amount, setAmount] = useState("0.01");
  const [newAmount, setNewAmount] = useState("");
  const [key, setKey] = useState(0);
  const clientId = process.env.REACT_APP_PAYPAL_CLIENT_ID;

  useEffect(() => {
    setNewAmount(totalPrice.toFixed(2));
    setAmount("");

    setKey((prevKey) => prevKey + 1);
  }, [totalPrice]);

  const createdOrder = (data, actions) => {
    const mainAmount = amount === "0.01" ? totalPrice.toFixed(2) : newAmount;
    // dispatch(handleRequestPaypal(true));

    // Создайте массив items с деталями каждого товара из orders
    const items = orders.map(
      ({ id, titleKey, price, count, type, plannerId, matId, coverId }) => {
        const newCuantity = type === "mat" ? 1 : count;

        const title =
          (titleKey ? t(`models.modelsTitles.${titleKey}`) : "") ||
          (type === "rug" && t(`constructor.titleNotFound`)) ||
          (type === "accessory" &&
            t(`accessories.planner.${plannerId}.title`)) ||
          (type === "mat" && t(`accessories.mat.${matId}.title`)) ||
          (type === "cover" && t(`accessories.cover.${coverId}.title`));

        return {
          name: title, // Название товара
          unit_amount: {
            currency_code: "PLN",
            value: price.toFixed(2), // Цена за единицу
          },
          quantity: newCuantity, // Количество
          sku: id, // Артикул, если доступен
          category: "PHYSICAL_GOODS", // Категория товара, например, "PHYSICAL_GOODS" или "DIGITAL_GOODS"
        };
      }
    );

    return actions.order.create({
      purchase_units: [
        {
          amount: {
            currency_code: "PLN",
            value: mainAmount,
            breakdown: {
              item_total: {
                currency_code: "PLN",
                value: mainAmount, // Общая сумма товаров
              },
            },
          },
          items, // Передача массива товаров в правильном ключе
        },
      ],
    });
  };

  const onApprove = async (data, actions) => {
    const { paymentSource, paymentID } = data;

    try {
      const details = await actions.order.capture(); // Ожидаем завершение транзакции
      console.log("details.status", details);
      console.log("details.status", details.payer);

      // Проверяем статус транзакции
      if (details.status === "COMPLETED") {
        const customerData = {
          name: `${details.payer.name.given_name} ${details.payer.name.surname}`,
          email: details.payer.email_address,
          phone: details.payer.phone
            ? details.payer.phone.phone_number.national_number
            : "Нет телефона",
          text: `Оплачено онлайн`,
        };

        function formatPhoneNumber(phoneNumber) {
          const numberStr = phoneNumber.toString(); // Преобразуем номер в строку, если он не в строковом формате
          return `+48 ${numberStr.slice(0, 3)} ${numberStr.slice(
            3,
            6
          )} ${numberStr.slice(6)}`; // Форматируем номер, добавляя префикс и разделяя на группы
        }

        const formattedPhone = formatPhoneNumber(customerData.phone);

        // Устанавливаем поля и ждем завершения всех `setFieldValue`
        await Promise.all([
          setFieldValue("name", customerData.name),
          setFieldValue("phone", formattedPhone),
          setFieldValue("email", customerData.email),
          setFieldValue("pay", paymentSource),
          setFieldValue("paymentId", paymentID),
          setFieldValue("text", customerData.text),
        ]);

        // handleSubmit();
        // После всех установок данных, вызываем handleSubmit
        setTimeout(() => {
          // dispatch(handleRequestPaypal(false));
          handleSubmit();
        }, 300);
      } else {
        console.log("Оплата не завершена");
      }
    } catch (error) {
      console.error("Ошибка при обработке оплаты:", error);
    }
  };

  const onError = (error) => {
    // console.error('Произошла ошибка при обработке платежа:', error);

    if (error.message.includes("Network Error")) {
      alert("Problem z połączeniem. Sprawdź internet i spróbuj ponownie.");
    } else if (error.message.includes("client-id")) {
      alert("Błąd podczas inicjalizacji PayPal. Proszę spróbować później.");
    } else if (error.message.includes("popup")) {
      alert(
        "Okno płatności zostało zamknięte przed zakończeniem. Spróbuj ponownie."
      );
    } else if (error.message.includes("authentication")) {
      alert("Problem z uwierzytelnieniem. Odśwież stronę i spróbuj ponownie.");
    } else if (error.message.includes("order creation")) {
      alert("Błąd podczas tworzenia zamówienia. Spróbuj ponownie.");
    } else {
      alert("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
    }
  };

  // corrected the code parameters
  // Now displays the Paypal Blik and debit card button
  // unfortunately, if you put the przelewy24 key, it will give an error 400
  const initialOptions = {
    "client-id": clientId,
    "enable-funding": "blik", //in order to display the bank highlight button, I left only this key
    intent: "capture",
    currency: "PLN",
    locale: "pl_PL",
  };

  const styles = { layout: "vertical", height: 40 };

  return (
    <PayPalScriptProvider options={initialOptions}>
      <PayPalButnContainer>
        <p>Płatność online</p>
        <PayPalButtons
          key={key}
          style={styles}
          createOrder={createdOrder}
          onApprove={onApprove}
          onCancel={() => navigate("/basket")}
          onError={onError}
        />
      </PayPalButnContainer>
    </PayPalScriptProvider>
  );
}

export default PayPalBtn;

/* --------------------------------- STYLED --------------------------------- */
const PayPalButnContainer = styled.div`
  width: 100%;
  margin-top: 45px;
  height: 125px;
  overflow-y: hidden;

  p {
    text-align: center;
    margin-bottom: 10px;
    font-weight: bold;
  }
`;
