1- Done

What is the difference between the "npm run build" command and the "vercel --prod", which I've been currently using to really deploy to Vercel. Deep research our project to understand what they're both doing. 

ALREADY ASKED.





2- Done

In relation to:

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






3- Done

I think we should also clarify that alerts coming from Warehouse Delays should be directed towards merchants, meaning, the phone number and email of the store owner, since the responsibility of not shipping a product would almost 100% be probably on the merchant's side.

In that sense, that type of delay is differnt from the other two: Carrier and Stuck in Transit. Since these probably relate to either Carrier's fault or maybe any other geografical or natural environment issue and at the same time, the order delayed alert message or email would go directly to the end customer (our merchant's clients customers).

Do you think it might be a good idea to inform the customer about these facts? If so, where would we add that? We already have some accordion panels where we explain more about each type of delay, but I'm just wondering if there could be a significantly better place or way in terms of UI/UX.

A new question came to mind while typing this prompt:

How and where would our app know about which number or email direction should our delay message be sent to? I guess we would have access to our merchant clients phone numbers and emails since that would be a requirement to subscribe to our APP? If that's the case, have we built an interface and the code infrastructure where the new user would do that?

Also, I would assume that for the Carrier and Stuck in Transit delays, we would always have the number and email of the end customer, since that's a requirement when you purchase any good through shopify checkout?



4- Pending

Make sure our APP doesn't cause CSS/JS Leakeage causing problems to our Merchant's site.



5- Pending

I want you to build me 20 questions and answers pretending that you're being interviewed by other tech leaders that are curious to know about your application. You can start with simple question and answers that would give knowledge about our APP, the reasons behind why we did it as we did, and then progressively move towards questions that answers specific technical decisions and implementations.


6- In Progress

Now that we're set in terms of UI/UX, I'd like to spend some time to make sure all the data that we're basically offering to our client merchants are actually real data that we can provide to them. I'd like you to deeply analyze the exact origin on where It might come from. And if you're not sure we should mark it at least in our docs as such. Then I would like you to succintly explain to me how we would go about testing this with a development store, which we still haven't made. I would like you to first make a list of every data fact that we can dynamically offer through our App so far. Make sure to actively go through our entire App and see all of the possible scenarios.


7- Done
In order to make our App's look and feel much better, I think we could also replace all of the default icons we're using that are basically coming probably from MAC OS, we should use beautiful images as icons that would be aligned elegantly with all of the rest of the asthetics of the page. What do you suggest we could do.


8- Done
Right now we can move an alert from active to resolved or dismissed.
But we don't have that option from resolved and dismissed alerts.
Could it be useful to allow that?


9- In progress

Rethink the UI/UX again in the most bigger sense so that it allows us to build a similar experience such as the services helped by (https://www.anchour.com/work/). In the previous endpoing analyze specifically the ones that are clients that offer services such as:

    1. Lighthouse
    The credit union on a mission to modernize financial wellness.

    2. Payground
    Revolutionizing how families manage healthcare payments.

    3. Tribal Credit
    Showcasing the advantages of a new kind of credit card for startups.
  

See if we can apply similar principles and aesthetics, including the photo styles that they utilize. In order to get high quality pictures, we'll use another service specialed in generating images with AI. But at least you'll need to tell me the precise prompt in order to get the image that you're imagining. Also, though it might be obvious, think about the service we're providing to the Shopify Merchants as Delayguard-App. Consider only the services that we're mostly sure we can provide based on our DATA_AVAILABILITY_ANALYSIS.md.

Give me detailed steps.
