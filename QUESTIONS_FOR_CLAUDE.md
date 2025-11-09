1- What is the difference between the "npm run build" command and the "vercel --prod", which I've been currently using to really deploy to Vercel. Deep research our project to understand what they're both doing. 

ALREADY ASKED.





2- In relation to:

```

📦
Warehouse Delays
Alert me when orders sit unfulfilled for:
2
days

💡 Learn More About Warehouse Delays
▼
📌 What this detects:

Orders that haven't been fulfilled (shipped) after being placed. This catches orders stuck in YOUR warehouse or fulfillment center before they even leave your facility.

🔍 How it works:

If an order sits in "unfulfilled" status for 2+ days, DelayGuard sends you an alert. You can adjust this threshold based on your typical fulfillment speed.

💼 Real-world example:

Customer orders on Monday → By Wednesday (2 days later), order still shows "unfulfilled" → You get an alert: "Order #12345 is stuck in your warehouse!" You can investigate (out of stock? picking error? staffing issue?) and fix it before the customer complains.

✅ Why it matters:

Most customer complaints happen when orders don't ship on time. This rule catches internal bottlenecks early, giving you time to fix problems BEFORE customers get frustrated. Critical for high-value orders!

```


Can you confirm how would we go about getting an "unfulfilled" status from an order? show me exact functions that would be in charged of knowing that in our codebase.


ALREADY ASKED







3- 

I think we should also clarify that alerts coming from Warehouse Delays should be directed towards merchants, meaning, the phone number and email of the store owner, since the responsibility of not shipping a product would almost 100% be probably on the merchant's side.

In that sense, that type of delay is differnt from the other two: Carrier and Stuck in Transit. Since these probably relate to either Carrier's fault or maybe any other geografical or natural environment issue and at the same time, the order delayed alert message or email would go directly to the end customer (our merchant's clients customers).

Do you think it might be a good idea to inform the customer about these facts? If so, where would we add that? We already have some accordion panels where we explain more about each type of delay, but I'm just wondering if there could be a significantly better place or way in terms of UI/UX.

A new question came to mind while typing this prompt:

How and where would our app know about which number or email direction should our delay message be sent to? I guess we would have access to our merchant clients phone numbers and emails since that would be a requirement to subscribe to our APP? If that's the case, have we built an interface and the code infrastructure where the new user would do that?

Also, I would assume that for the Carrier and Stuck in Transit delays, we would always have the number and email of the end customer, since that's a requirement when you purchase any good through shopify checkout?



 