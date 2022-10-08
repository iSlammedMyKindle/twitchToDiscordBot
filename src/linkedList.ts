// Function and type declarations so that we dont have
// function thing(): (() => () => void) | linkedListNode<T>
// every single time.
declare function getItemAt(index: number, isForward: boolean): typeof getItemAt;
type SameReturn<T> = (() => () => void) | T;

class linkedListNode<T>
{
    public data: T | undefined;
    public next: linkedListNode<T> | null = null;
    public prev: linkedListNode<T> | null = null;

    constructor(data?: T)
    {
        if(data)
            this.data = data;
    }

    /**
     * @description Grabs an item from the linked list based on this node's posistion, either backward or forwards
     * @param {number} index Grab items that are before this one, or after this one. A postive index takes you forward, and a negative index brings you back. it's possible for a undefined value to exist.
     * @param {boolean} isForward false traverses backwards, true goes forwards
     * @returns {getItemAt | null | linkedListNode<T>} Refer to the index parameter's description, as it gives a good explanation of wahts happening.
     * @see linkedListNode
     */
    getItemAt(index: number = 0, isForward: boolean = true):
        typeof getItemAt
        | null
        | linkedListNode<T>
    {

        if(index === 0) return this;

        if(index < 0) return null;

        const key: string = isForward ? 'prev' : 'next';

        if(this[key as keyof linkedListNode<T>] && index)
            return (this[key as keyof linkedListNode<T>] as linkedListNode<T>)!.getItemAt(--index, isForward);

        return null;
    }

    get beg(): SameReturn<linkedListNode<T>>
    {
        if(this.prev !== null)
            return (this.prev as linkedListNode<T>).beg;

        return this;
    }

    get end(): SameReturn<linkedListNode<T>>
    {
        if(this.next !== null)
            return this.next.end;

        return this;
    }
}

class nodeInterface<T>
{
    // The node that was last made using `addNode`; should always be the last node in the list.
    public lastCreatedNode: linkedListNode<T> | null = null;
    public beginningNode: linkedListNode<T> | null = null;

    constructor(data?: T)
    {
        if(data)
            this.beginningNode =
                this.lastCreatedNode =
                new linkedListNode(data);
    }

    /**
     * @description Adds a node to the linkedList.
     * @param {T} data - the data that will be inserted into the new linked list node.
     * @returns {void} The new node that was created, it will also be placed inside `lastCreatedNode`
     */
    addNode(data: T): linkedListNode<T>
    {
        const newNode = new linkedListNode(data);
        newNode.prev = this.lastCreatedNode;

        if(this.lastCreatedNode)
            this.lastCreatedNode.next = newNode;

        // If this is our first node, set it as such
        if(!this.beginningNode) this.beginningNode = newNode;

        // Shift the last created node to our new one.
        this.lastCreatedNode = newNode;

        return newNode;
    }

    /**
     * @description Basically prepare this node for deletion, once this is done, memory management from js will need to take care of this after a `delete` call
     * @param {linkedListNode<T>} targetNode The node to stage for deletion.
     * @returns {void} Nothing 
     */
    rebindForDelete(targetNode: linkedListNode<T>): void
    {
        if(targetNode.next?.prev)
            targetNode.next.prev = targetNode.prev;

        if(targetNode.prev?.next)
            targetNode.prev.next = targetNode.next;

        // If this is the last linked node in the list, grab it's previous node instead to make that the "lastCreatedNode" (credit - bevelled from twitch)
        if(this.lastCreatedNode === targetNode)
            this.lastCreatedNode = targetNode.prev;

        if(this.beginningNode === targetNode)
            this.beginningNode = targetNode.next;
    }
}

export
{
    linkedListNode,
    nodeInterface
};