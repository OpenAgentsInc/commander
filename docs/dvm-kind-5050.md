# Text Generation

## Input

Clients MIGHT provide a seed sentence or a prompt in the `"i" tag field` field for the AI to continue generating from.

## Params

#### NOTE: All parameters are optional and additional application specific parameters can be added.

## `model`

Description: Specifies the identifier for the AI model to be used for the text generation task. Different models might have different capabilities, sizes, training data, or fine-tuning, which can lead to variations in output quality and style.

Usage: Set this parameter to the specific ID or name of the AI model you wish to use. This is especially useful if you have multiple models available and you want to select a particular one for a task. Ensure that the specified model is compatible with the task at hand and has been adequately trained or fine-tuned for optimal results.

For instance, if you have a model specifically trained for medical text generation and another for general-purpose tasks, you might use the Model-Id parameter to specify which one to use based on the context of your request.

## `max_tokens`

Description: Defines the maximum number of tokens (words, punctuation marks, etc.) that the generated output should contain. It helps to limit the length of the response and ensures that the output does not exceed a certain size.

Usage: If you want a short response, set a lower value. For longer responses, increase the value.

## `temperature`

Description: Controls the randomness of the AI’s output. A higher value makes the output more random, while a lower value makes it more deterministic and focused on the most likely completion.

Usage: Values typically range from 0.1 to 2.0. A value of 1.0 is neutral, below 1.0 makes the model more conservative, and above 1.0 makes it more creative.

## `top_k`

Description: Limits the AI to consider only the top K probable next words/tokens when generating a response. It narrows down the choices and can make the output more coherent, especially when set to a reasonable number.

Usage: Common values might range from 20 to 50, but it can vary based on the specific task.

## `top_p`

Description: Also known as “nucleus sampling.” Instead of just taking the top K probable words, it selects the smallest set of words whose cumulative probability exceeds a threshold P. This allows for more diversity than Top-K alone.

Usage: Values are typically between 0.7 and 0.95. A higher value results in more randomness in the output.

## `frequency_penalty`

Description: Applies a penalty to words/tokens that the model has already used, discouraging it from repeating the same words or phrases. This helps to make the output more diverse and reduces redundancy.

Usage: Values greater than 1.0 discourage repetition, while values less than 1.0 encourage it. For instance, setting it to 1.2 might mildly discourage repetition.

```
[ "param", "model", "LLaMA-2" ],
[ "param", "max_tokens", "512" ],
[ "param", "temperature", "0.5" ],
[ "param", "top-k", "50" ],
[ "param", "top-p", "0.7" ],
[ "param", "frequency_penalty", "1" ]

```

## Output

Including but not limited to:

- `text/plain`
- `text/markdown`

## Example

## Generates the output based on the input prompt and params

```
{
    "content": "",
    "kind": 5050,
    "tags": [
        [ "i", "what is the capital of France? ", "prompt" ],
        [ "param", "model", "LLaMA-2"],
        [ "param",  "max_tokens", "512"],
        [ "param", "temperature", "0.5"],
        [ "param", "top-k", "50"],
        [ "param", "top-p", "0.7"],
        [ "param",  "frequency_penalty", "1"]
    ]
}

```
