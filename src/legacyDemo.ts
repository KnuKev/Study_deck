import type { Course, CourseId, Question } from './model.ts'

export const LEGACY_COURSES: Course[] = [
  {
    id: 'IN3050', shortTitle: 'Artificial intelligence', title: 'Introduction to Artificial Intelligence and Machine Learning',
    description: 'Learning, search, and evaluation of intelligent systems.',
    topics: [
      { id: 'learning', title: 'Machine Learning', description: 'Training data, generalisation, and types of learning.' },
      { id: 'evaluation', title: 'Evaluation', description: 'Test sets, confusion matrices, and metrics.' },
      { id: 'search', title: 'Search and Optimization', description: 'Search spaces, heuristics, and evolutionary methods.' },
      { id: 'neural', title: 'Neural Networks', description: 'Weights, activations, and gradient-based learning.' },
    ],
  },
  {
    id: 'IN3230', shortTitle: 'Networking', title: 'Networking',
    description: 'Protocols, addressing, and communication between computers.',
    topics: [
      { id: 'addressing', title: 'Addressing and Routing', description: 'IP addresses, network prefixes, and forwarding.' },
      { id: 'transport', title: 'Transport Protocols', description: 'TCP, UDP, and reliable transport.' },
      { id: 'link', title: 'Link Layer', description: 'Frames, MAC addresses, and error detection.' },
      { id: 'performance', title: 'Performance and Flow Control', description: 'Delay, capacity, and traffic control.' },
    ],
  },
]

const source = 'Legacy sample question'
function choice(courseId: CourseId, topicId: string, id: string, prompt: string, answers: string[], correct: number, explanation: string, figure?: Question['figure']): Question {
  return { id, courseId, topicId, difficulty: 'easy', isDemo: true, type: 'choice', prompt, options: answers.map((text, i) => ({ id: String(i), text })), correctOptionId: String(correct), explanation, source, ...(figure ? { figure } : {}) }
}
function boolean(courseId: CourseId, topicId: string, id: string, prompt: string, correct: boolean, explanation: string): Question {
  return { id, courseId, topicId, difficulty: 'easy', isDemo: true, type: 'boolean', prompt, options: [{ id: 'true', text: 'True' }, { id: 'false', text: 'False' }], correctOptionId: String(correct), explanation, source }
}

export const LEGACY_QUESTIONS: Question[] = [
  choice('IN3050', 'learning', 'ai-learning-1', 'What characterises supervised learning?', ['The model learns only by trying actions in an environment.', 'The model trains on examples with corresponding targets.', 'The model needs no training data.', 'The model always divides data into clusters.'], 1, 'In supervised learning, the training data contain both inputs and known targets, such as classes or numerical values.'),
  boolean('IN3050', 'learning', 'ai-learning-2', 'A model with very low error on its training data can still perform poorly on new data.', true, 'The model may have overfitted the training data. Generalisation must be evaluated on data it did not train on.'),
  choice('IN3050', 'learning', 'ai-learning-3', 'Which task is an example of regression?', ['Grouping images without labels.', 'Deciding whether an email is spam.', 'Predicting a house price in kroner.', 'Finding a shortest path in a graph.'], 2, 'Regression predicts a numerical value. Classification assigns a class.'),
  choice('IN3050', 'evaluation', 'ai-evaluation-1', 'Why do we keep a test set separate from training?', ['To make the training set as small as possible.', 'To choose the model weights after every round of training.', 'To avoid defining a metric.', 'To estimate performance on data the model has not trained on.'], 3, 'A separate test set helps evaluate generalisation. Repeatedly using it for model selection lets the test set influence development.', 'pipeline'),
  choice('IN3050', 'evaluation', 'ai-evaluation-2', 'A classifier has 8 true positives and 2 false positives. What is the precision for the positive class?', ['80%', '20%', '60%', 'It cannot be determined without the number of true negatives.'], 0, 'Precision = TP / (TP + FP) = 8 / (8 + 2) = 0.8. True negatives are not part of this metric.'),
  boolean('IN3050', 'evaluation', 'ai-evaluation-3', 'An accuracy of 99% guarantees that the model identifies at least 99% of the examples in every class.', false, 'Accuracy measures the fraction of correct predictions overall. If 99% of examples are negative, a model that always predicts negative achieves 99% accuracy and identifies no positive examples.'),
  choice('IN3050', 'search', 'ai-search-1', 'What property must an admissible heuristic have?', ['It must always equal zero.', 'It must always overestimate the remaining cost.', 'It must never overestimate the optimal remaining cost.', 'It must equal the number of neighbouring nodes.'], 2, 'An admissible heuristic is optimistic. h(n) never exceeds the true minimum cost from n to the goal.'),
  boolean('IN3050', 'search', 'ai-search-2', 'Breadth-first search finds a path with the fewest edges when such a path exists in a finite, unweighted graph.', true, 'Breadth-first search explores every node at one depth before moving to the next. With correct visited-node tracking, it finds a path with the fewest edges.'),
  choice('IN3050', 'search', 'ai-search-3', 'What is a common purpose of mutation in a genetic algorithm?', ['Making all individuals identical.', 'Introducing variation into the population.', 'Proving that the global optimum has been found.', 'Eliminating the need for a fitness function.'], 1, 'Mutation introduces variation and can make new regions of the search space reachable. It gives no guarantee of finding a global optimum.'),
  choice('IN3050', 'neural', 'ai-neural-1', 'What is the main purpose of backpropagation?', ['Sorting training data by label.', 'Choosing the number of classes in the dataset.', 'Dividing the dataset into random clusters.', 'Calculating gradients of the loss function with respect to the parameters.'], 3, 'Backpropagation uses the chain rule to compute gradients efficiently. An optimisation method then uses those gradients to update the parameters.'),
  boolean('IN3050', 'neural', 'ai-neural-2', 'A network with several layers of only linear transformations can represent nonlinear relationships.', false, 'A composition of linear transformations is still linear regardless of depth. The network needs nonlinear operations such as activation functions. Bias terms alone do not provide nonlinearity.'),
  choice('IN3050', 'neural', 'ai-neural-3', 'What does the learning rate control in standard gradient descent?', ['The size of the parameter update.', 'The number of labels in the dataset.', 'Whether the test error is guaranteed to be zero.', 'The number of hidden layers.'], 0, 'The learning rate scales the step in the direction opposite the gradient. Large steps can destabilise training, while small steps can make progress slow.'),
  choice('IN3230', 'addressing', 'net-addressing-1', 'What does an IP router do when forwarding a packet between networks?', ['Sorts packets by filename.', 'Finds the recipient’s password.', 'Chooses the next hop using the destination address and the routing table.', 'Always changes the transport protocol from UDP to TCP.'], 2, 'The router uses the destination IP address to choose a route, typically through longest-prefix matching.', 'network'),
  boolean('IN3230', 'addressing', 'net-addressing-2', 'An IPv4 address consists of 32 bits.', true, 'IPv4 uses 32-bit addresses, usually written as four decimal numbers. IPv6 uses 128 bits.'),
  choice('IN3230', 'addressing', 'net-addressing-3', 'What does a /24 prefix length mean for an IPv4 network?', ['The network always has exactly 24 hosts.', 'The first 24 bits identify the network prefix.', 'Each packet carries 24 bytes of payload.', 'The address is an IPv6 address.'], 1, 'A /24 prefix uses the first 24 of the 32 bits as the network prefix. The remaining 8 bits vary within that prefix.'),
  choice('IN3230', 'transport', 'net-transport-1', 'What service does TCP offer applications?', ['A reliable, ordered byte stream.', 'A guarantee that every message arrives within one millisecond.', 'Automatic encryption of all data.', 'Datagrams that always arrive in random order.'], 0, 'TCP provides an ordered byte stream using mechanisms such as retransmission. A connection can fail, and delivery has no guaranteed delay.'),
  boolean('IN3230', 'transport', 'net-transport-2', 'UDP automatically retransmits lost datagrams.', false, 'UDP has no built-in retransmission. Applications that require reliability must implement it themselves or use a protocol that provides it.'),
  choice('IN3230', 'transport', 'net-transport-3', 'What is an important purpose of port numbers?', ['Replacing IP addresses in the routing table.', 'Determining the maximum cable length.', 'Specifying the screen size.', 'Helping the operating system deliver traffic to the correct endpoint.'], 3, 'The transport layer uses ports when multiplexing and demultiplexing traffic. Ports help distinguish services and connections on the same host.'),
  choice('IN3230', 'link', 'net-link-1', 'Which address does a standard Ethernet switch use to choose an outgoing port for a known unicast frame?', ['The sender’s email address.', 'The destination MAC address.', 'The application’s DNS name.', 'The TCP sequence number.'], 1, 'The switch looks up the destination MAC address in its forwarding table. It usually learns entries from source addresses on incoming frames.'),
  boolean('IN3230', 'link', 'net-link-2', 'A CRC check can guarantee detection of every possible bit error.', false, 'A CRC detects many types of errors, but some error patterns produce the same check value as the original frame.'),
  choice('IN3230', 'link', 'net-link-3', 'What is ARP normally used for on a local IPv4 network?', ['Encrypting Ethernet frames.', 'Resolving domain names into IP addresses.', 'Finding the MAC address associated with a local IPv4 address.', 'Calculating the shortest path through the Internet.'], 2, 'ARP maps IPv4 addresses to link-layer addresses on the local network. Traffic to a different network is normally sent to the gateway’s MAC address.'),
  choice('IN3230', 'performance', 'net-performance-1', 'What is the transmission time for a 1,000-byte packet over a 1 Mbit/s link, excluding overhead?', ['8 ms', '1 ms', '1 s', '8 s'], 0, '1,000 bytes = 8,000 bits. The transmission time is 8,000 / 1,000,000 seconds = 0.008 seconds = 8 ms. Propagation delay is additional.'),
  boolean('IN3230', 'performance', 'net-performance-2', 'Flow control and congestion control solve exactly the same problem.', false, 'Flow control protects the receiver from a sender that transmits too fast. Congestion control limits the load on the network.'),
  choice('IN3230', 'performance', 'net-performance-3', 'What does round-trip time (RTT) measure?', ['The number of bytes a router can hold.', 'Only the time needed to put the bits onto the link.', 'The number of IP addresses in the network.', 'The time from sending something to receiving the corresponding response.'], 3, 'RTT measures the time for a round trip. It can include transmission, propagation, queuing, and processing delays depending on how it is measured.'),
]
